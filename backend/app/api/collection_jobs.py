import sqlite3
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..database import get_connection


router = APIRouter(prefix="/api", tags=["collection-jobs"])

VALID_STATUSES = {"pending", "running", "completed", "failed", "cancelled"}


class CreateCollectionJobRequest(BaseModel):
    account_id: int
    group_id: int
    range_start: str
    range_end: str
    collector_type: str = "time_range_placeholder"


class UpdateCollectionJobStatusRequest(BaseModel):
    status: str
    error_message: str | None = None


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {key: row[key] for key in row.keys()}


def parse_datetime(value: str, field_name: str) -> datetime:
    normalized = value.replace("T", " ")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be an ISO-like datetime string.",
        ) from error


def normalize_datetime(value: str, field_name: str) -> str:
    return parse_datetime(value, field_name).strftime("%Y-%m-%d %H:%M:%S")


def ensure_account_and_group(
    connection: sqlite3.Connection,
    account_id: int,
    group_id: int,
) -> tuple[sqlite3.Row, sqlite3.Row]:
    account = connection.execute(
        "SELECT id, display_name FROM weibo_accounts WHERE id = ?",
        (account_id,),
    ).fetchone()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")

    group = connection.execute(
        """
        SELECT id, account_id, name
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

    return account, group


@router.get("/collection-jobs")
def list_collection_jobs(
    account_id: int | None = None,
    group_id: int | None = None,
    status: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    filters = []
    params: list[Any] = []

    if account_id is not None:
        filters.append("cj.account_id = ?")
        params.append(account_id)
    if group_id is not None:
        filters.append("cj.group_id = ?")
        params.append(group_id)
    if status:
        filters.append("cj.status = ?")
        params.append(status)

    where_sql = f"WHERE {' AND '.join(filters)}" if filters else ""
    total = int(
        connection.execute(
            f"""
            SELECT COUNT(*)
            FROM collection_jobs cj
            JOIN weibo_accounts wa ON wa.id = cj.account_id
            JOIN chat_groups cg ON cg.id = cj.group_id
            {where_sql}
            """,
            params,
        ).fetchone()[0]
    )

    rows = connection.execute(
        f"""
        SELECT
            cj.id,
            cj.account_id,
            wa.display_name AS account_name,
            cj.group_id,
            cg.name AS group_name,
            cj.range_start,
            cj.range_end,
            cj.status,
            cj.started_at,
            cj.finished_at,
            cj.total_seen_count,
            cj.inserted_count,
            cj.skipped_count,
            cj.failed_count,
            cj.error_message,
            cj.collector_type,
            cj.created_at
        FROM collection_jobs cj
        JOIN weibo_accounts wa ON wa.id = cj.account_id
        JOIN chat_groups cg ON cg.id = cj.group_id
        {where_sql}
        ORDER BY cj.created_at DESC, cj.id DESC
        LIMIT ? OFFSET ?
        """,
        [*params, limit, offset],
    ).fetchall()

    return {
        "items": [row_to_dict(row) for row in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("/collection-jobs")
def create_collection_job(
    request: CreateCollectionJobRequest,
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    ensure_account_and_group(connection, request.account_id, request.group_id)
    range_start = normalize_datetime(request.range_start, "range_start")
    range_end = normalize_datetime(request.range_end, "range_end")
    if parse_datetime(range_start, "range_start") >= parse_datetime(range_end, "range_end"):
        raise HTTPException(status_code=400, detail="range_start must be before range_end.")

    cursor = connection.execute(
        """
        INSERT INTO collection_jobs (
            account_id,
            group_id,
            range_start,
            range_end,
            status,
            collector_type
        )
        VALUES (?, ?, ?, ?, 'pending', ?)
        """,
        (
            request.account_id,
            request.group_id,
            range_start,
            range_end,
            request.collector_type,
        ),
    )
    job_id = int(cursor.lastrowid)
    return get_collection_job(job_id, connection)


@router.get("/collection-jobs/{job_id}")
def get_collection_job(
    job_id: int,
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    row = connection.execute(
        """
        SELECT
            cj.*,
            wa.display_name AS account_name,
            cg.name AS group_name
        FROM collection_jobs cj
        JOIN weibo_accounts wa ON wa.id = cj.account_id
        JOIN chat_groups cg ON cg.id = cj.group_id
        WHERE cj.id = ?
        """,
        (job_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Collection job not found")
    return row_to_dict(row)


@router.patch("/collection-jobs/{job_id}/status")
def update_collection_job_status(
    job_id: int,
    request: UpdateCollectionJobStatusRequest,
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    if request.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid collection job status")

    current = connection.execute(
        "SELECT id FROM collection_jobs WHERE id = ?",
        (job_id,),
    ).fetchone()
    if current is None:
        raise HTTPException(status_code=404, detail="Collection job not found")

    started_at_sql = "CURRENT_TIMESTAMP" if request.status == "running" else "started_at"
    finished_at_sql = (
        "CURRENT_TIMESTAMP"
        if request.status in {"completed", "failed", "cancelled"}
        else "finished_at"
    )
    connection.execute(
        f"""
        UPDATE collection_jobs
        SET status = ?,
            error_message = ?,
            started_at = {started_at_sql},
            finished_at = {finished_at_sql}
        WHERE id = ?
        """,
        (request.status, request.error_message, job_id),
    )
    return get_collection_job(job_id, connection)

