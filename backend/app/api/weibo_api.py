from dataclasses import asdict, is_dataclass
from datetime import datetime
import sqlite3
import threading
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from ..collectors.weibo_api import (
    CookieProfileError,
    CookieProfileStore,
    WeiboApiClient,
    WeiboApiCollector,
    WeiboApiError,
    WeiboAuthenticationError,
    WeiboGroupError,
    WeiboRateLimitError,
)
from ..database import connection_context, get_connection
from ..services.collection_runner import (
    create_running_api_job,
    ingest_api_candidates,
    mark_api_job_failed,
)
from ..settings import get_settings
from .collection_jobs import get_collection_job, parse_datetime


router = APIRouter(prefix="/api", tags=["weibo-api"])

_account_locks: dict[int, threading.Lock] = {}
_account_locks_guard = threading.Lock()


class UpsertApiTargetRequest(BaseModel):
    account_id: int | None = None
    account_name: str = Field(min_length=1, max_length=120)
    group_id: int | None = None
    group_name: str = Field(min_length=1, max_length=200)
    source_group_id: str = Field(min_length=1, max_length=80)

    @field_validator("account_name", "group_name", "source_group_id")
    @classmethod
    def strip_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("value must not be blank")
        return stripped

    @field_validator("source_group_id")
    @classmethod
    def validate_source_group_id(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("source_group_id must contain digits only")
        return value


class SaveAccountCookiesRequest(BaseModel):
    cookies: list[dict[str, Any]] = Field(min_length=1, max_length=500)


class RunWeiboApiCollectionRequest(BaseModel):
    account_id: int
    group_id: int
    range_start: str
    range_end: str


def get_account_lock(account_id: int) -> threading.Lock:
    with _account_locks_guard:
        return _account_locks.setdefault(account_id, threading.Lock())


def status_to_dict(status: Any) -> dict[str, Any]:
    if is_dataclass(status):
        return asdict(status)
    if hasattr(status, "to_dict"):
        return dict(status.to_dict())
    if isinstance(status, dict):
        return dict(status)
    raise TypeError("Unsupported cookie profile status")


def public_collection_error(error: Exception) -> str:
    """Return a useful failure without reflecting credentials or raw payloads."""

    if isinstance(error, (WeiboApiError, CookieProfileError)):
        return str(error)
    if isinstance(error, sqlite3.Error):
        return "Local database operation failed."
    return "Collection failed because of an unexpected local error."


def group_has_history(connection: sqlite3.Connection, group_id: int) -> bool:
    """Whether changing this group's remote identity could mix archived data."""

    for table_name in (
        "messages",
        "collection_jobs",
        "browser_page_captures",
        "import_batches",
        "weibo_verification_reports",
    ):
        row = connection.execute(
            f"SELECT 1 FROM {table_name} WHERE group_id = ? LIMIT 1",
            (group_id,),
        ).fetchone()
        if row is not None:
            return True
    return False


def ensure_group_identity_can_change(
    connection: sqlite3.Connection,
    *,
    group_id: int,
    current_source_group_id: str | None,
    requested_source_group_id: str,
) -> None:
    if (
        current_source_group_id
        and current_source_group_id != requested_source_group_id
        and group_has_history(connection, group_id)
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "This group already has archived history and cannot be rebound to a different "
                "Weibo group ID. Create a new local group instead."
            ),
        )


def load_target(
    connection: sqlite3.Connection,
    account_id: int,
    group_id: int,
) -> tuple[sqlite3.Row, sqlite3.Row]:
    account = connection.execute(
        """
        SELECT id, display_name, auth_type, login_profile_name, is_active
        FROM weibo_accounts
        WHERE id = ?
        """,
        (account_id,),
    ).fetchone()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    if not int(account["is_active"]):
        raise HTTPException(status_code=400, detail="Account is inactive")

    group = connection.execute(
        """
        SELECT id, account_id, name, source_group_id, is_active
        FROM chat_groups
        WHERE id = ?
        """,
        (group_id,),
    ).fetchone()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    if int(group["account_id"]) != account_id:
        raise HTTPException(
            status_code=400,
            detail="The selected group does not belong to the selected account.",
        )
    if not int(group["is_active"]):
        raise HTTPException(status_code=400, detail="Group is inactive")
    if not group["source_group_id"]:
        raise HTTPException(
            status_code=400,
            detail="Group source ID is not configured",
        )
    return account, group


@router.post("/weibo-api/targets")
def upsert_api_target(
    request: UpsertApiTargetRequest,
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    if request.account_id is not None:
        account = connection.execute(
            "SELECT id FROM weibo_accounts WHERE id = ?",
            (request.account_id,),
        ).fetchone()
        if account is None:
            raise HTTPException(status_code=404, detail="Account not found")
        account_id = request.account_id
        connection.execute(
            """
            UPDATE weibo_accounts
            SET display_name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (request.account_name, account_id),
        )
    else:
        account = connection.execute(
            "SELECT id FROM weibo_accounts WHERE display_name = ?",
            (request.account_name,),
        ).fetchone()
        if account is None:
            cursor = connection.execute(
                """
                INSERT INTO weibo_accounts (display_name, auth_type, notes)
                VALUES (?, 'weibo_cookie_api', 'Configured for Weibo API collection.')
                """,
                (request.account_name,),
            )
            account_id = int(cursor.lastrowid)
        else:
            account_id = int(account["id"])

    duplicate_source = connection.execute(
        """
        SELECT id
        FROM chat_groups
        WHERE account_id = ?
          AND source_group_id = ?
          AND (? IS NULL OR id <> ?)
        """,
        (account_id, request.source_group_id, request.group_id, request.group_id),
    ).fetchone()
    if duplicate_source is not None:
        raise HTTPException(
            status_code=409,
            detail="This source group ID is already bound to another group for the account.",
        )

    if request.group_id is not None:
        group = connection.execute(
            "SELECT id, account_id, source_group_id FROM chat_groups WHERE id = ?",
            (request.group_id,),
        ).fetchone()
        if group is None:
            raise HTTPException(status_code=404, detail="Group not found")
        if int(group["account_id"]) != account_id:
            raise HTTPException(
                status_code=400,
                detail="The selected group does not belong to the selected account.",
            )
        group_id = request.group_id
        ensure_group_identity_can_change(
            connection,
            group_id=group_id,
            current_source_group_id=group["source_group_id"],
            requested_source_group_id=request.source_group_id,
        )
        connection.execute(
            """
            UPDATE chat_groups
            SET name = ?, source_group_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (request.group_name, request.source_group_id, group_id),
        )
    else:
        group = connection.execute(
            """
            SELECT id, source_group_id
            FROM chat_groups
            WHERE account_id = ? AND name = ?
            """,
            (account_id, request.group_name),
        ).fetchone()
        if group is None:
            cursor = connection.execute(
                """
                INSERT INTO chat_groups (account_id, name, source_group_id, description)
                VALUES (?, ?, ?, 'Configured for Weibo API collection.')
                """,
                (account_id, request.group_name, request.source_group_id),
            )
            group_id = int(cursor.lastrowid)
        else:
            group_id = int(group["id"])
            ensure_group_identity_can_change(
                connection,
                group_id=group_id,
                current_source_group_id=group["source_group_id"],
                requested_source_group_id=request.source_group_id,
            )
            connection.execute(
                """
                UPDATE chat_groups
                SET source_group_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (request.source_group_id, group_id),
            )

    account_row = connection.execute(
        """
        SELECT id, display_name, auth_type, login_profile_name, is_active
        FROM weibo_accounts WHERE id = ?
        """,
        (account_id,),
    ).fetchone()
    group_row = connection.execute(
        """
        SELECT id, account_id, name, source_group_id, is_active
        FROM chat_groups WHERE id = ?
        """,
        (group_id,),
    ).fetchone()
    return {
        "account": dict(account_row),
        "group": dict(group_row),
    }


@router.put("/weibo-api/accounts/{account_id}/cookies")
def save_account_cookies(
    account_id: int,
    request: SaveAccountCookiesRequest,
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    account = connection.execute(
        "SELECT id FROM weibo_accounts WHERE id = ?",
        (account_id,),
    ).fetchone()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")

    account_lock = get_account_lock(account_id)
    if not account_lock.acquire(blocking=False):
        raise HTTPException(
            status_code=409,
            detail="This account already has a running API collection.",
        )
    store = CookieProfileStore(get_settings().weibo_api_auth_dir)
    try:
        try:
            status = store.save(account_id, request.cookies)
        except (ValueError, CookieProfileError) as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
    finally:
        account_lock.release()

    profile_name = f"account-{account_id}.cookies.json"
    connection.execute(
        """
        UPDATE weibo_accounts
        SET auth_type = 'weibo_cookie_api',
            login_profile_name = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (profile_name, account_id),
    )
    return status_to_dict(status)


@router.get("/weibo-api/status")
def get_api_status(
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    store = CookieProfileStore(get_settings().weibo_api_auth_dir)
    accounts: list[dict[str, Any]] = []
    for row in connection.execute(
        """
        SELECT id, display_name, auth_type, login_profile_name, is_active
        FROM weibo_accounts
        ORDER BY id
        """
    ):
        item = dict(row)
        item["cookie_profile"] = status_to_dict(store.status(int(row["id"])))
        accounts.append(item)

    groups = [
        dict(row)
        for row in connection.execute(
            """
            SELECT id, account_id, name, source_group_id, is_active
            FROM chat_groups
            ORDER BY account_id, id
            """
        )
    ]
    return {"accounts": accounts, "groups": groups}


@router.post("/collection-jobs/weibo-api")
def run_weibo_api_collection(request: RunWeiboApiCollectionRequest):
    settings = get_settings()
    try:
        configured_zone = ZoneInfo(settings.weibo_api_timezone)
    except ZoneInfoNotFoundError as error:
        raise HTTPException(
            status_code=500,
            detail="WEIBO_API_TIMEZONE is not a valid IANA timezone.",
        ) from error

    range_start = parse_datetime(request.range_start, "range_start")
    range_end = parse_datetime(request.range_end, "range_end")
    range_start = (
        range_start.replace(tzinfo=configured_zone)
        if range_start.tzinfo is None
        else range_start.astimezone(configured_zone)
    )
    range_end = (
        range_end.replace(tzinfo=configured_zone)
        if range_end.tzinfo is None
        else range_end.astimezone(configured_zone)
    )
    if range_start >= range_end:
        raise HTTPException(status_code=400, detail="range_start must be before range_end.")

    with connection_context() as connection:
        account, group = load_target(connection, request.account_id, request.group_id)
        account_name = str(account["display_name"])
        group_name = str(group["name"])
        source_group_id = str(group["source_group_id"])

    account_lock = get_account_lock(request.account_id)
    if not account_lock.acquire(blocking=False):
        raise HTTPException(
            status_code=409,
            detail="This account already has a running API collection.",
        )

    store = CookieProfileStore(settings.weibo_api_auth_dir)
    try:
        store.cookie_header(request.account_id)
    except (ValueError, CookieProfileError) as error:
        account_lock.release()
        raise HTTPException(status_code=400, detail=str(error)) from error

    job_id: int | None = None
    try:
        with connection_context() as connection:
            job_id = create_running_api_job(
                connection,
                account_id=request.account_id,
                group_id=request.group_id,
                range_start=range_start,
                range_end=range_end,
            )

        client = WeiboApiClient(
            store,
            timeout=settings.weibo_api_request_timeout_seconds,
            max_attempts=settings.weibo_api_max_retries + 1,
            backoff_base=settings.weibo_api_retry_base_seconds,
        )
        collector = WeiboApiCollector(
            client,
            source_group_id,
            page_size=settings.weibo_api_page_size,
            max_pages=settings.weibo_api_max_pages,
            timezone_name=settings.weibo_api_timezone,
            inter_page_delay=settings.weibo_api_page_delay_seconds,
        )
        candidates = collector.collect(
            request.account_id,
            request.group_id,
            range_start,
            range_end,
        )

        with connection_context() as connection:
            summary = ingest_api_candidates(
                connection,
                collection_job_id=job_id,
                account_id=request.account_id,
                group_id=request.group_id,
                candidates=candidates,
                source_total_count=getattr(collector, "total_seen_count", len(candidates)),
                page_count=getattr(collector, "page_count", 0),
            )
            job = get_collection_job(job_id, connection)

        return {
            "account": account_name,
            "group": group_name,
            "summary": summary.to_dict(),
            "job": job,
        }
    except Exception as error:
        error_detail = public_collection_error(error)
        if job_id is not None:
            with connection_context() as connection:
                mark_api_job_failed(connection, job_id, error_detail)
                job = get_collection_job(job_id, connection)
        else:
            job = None

        status_code = 502
        if isinstance(error, WeiboAuthenticationError):
            status_code = 401
        elif isinstance(error, WeiboGroupError):
            status_code = 404
        elif isinstance(error, WeiboRateLimitError):
            status_code = 429
        elif isinstance(error, CookieProfileError):
            status_code = 400
        elif not isinstance(error, WeiboApiError):
            status_code = 500
        return JSONResponse(
            status_code=status_code,
            content={"detail": error_detail, "job": job},
        )
    finally:
        account_lock.release()
