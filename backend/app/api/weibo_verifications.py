import json
import sqlite3
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..database import get_connection
from .collection_jobs import ensure_account_and_group, row_to_dict


router = APIRouter(prefix="/api", tags=["weibo-verifications"])

VALID_RISK_LEVELS = {"unknown", "low", "medium", "high"}
VALID_VERIFICATION_STATUSES = {"draft", "verified", "blocked"}
VALID_OBSERVATION_TYPES = {
    "message_history",
    "pagination",
    "image",
    "file",
    "link",
    "red_packet",
    "error",
    "official_api",
}
SENSITIVE_MARKERS = {
    '"authorization"',
    '"cookie"',
    '"password"',
    '"sessionid"',
    '"access_token"',
    '"refresh_token"',
    '"app_secret"',
    "bearer ",
    "x-csrf",
    "xsrf",
}


class CreateVerificationReportRequest(BaseModel):
    account_id: int
    group_id: int
    history_days_checked: int | None = None
    risk_level: Literal["unknown", "low", "medium", "high"] = "unknown"
    verification_status: Literal["draft", "verified", "blocked"] = "draft"
    notes: str | None = None


class UpdateVerificationReportRequest(BaseModel):
    can_login: bool | None = None
    can_view_group: bool | None = None
    can_view_history: bool | None = None
    history_days_checked: int | None = None
    can_page_history: bool | None = None
    can_access_images: bool | None = None
    can_access_files: bool | None = None
    can_access_links: bool | None = None
    red_packet_identified: bool | None = None
    rate_limit_observed: bool | None = None
    risk_level: Literal["unknown", "low", "medium", "high"] | None = None
    verification_status: Literal["draft", "verified", "blocked"] | None = None
    notes: str | None = None


class CreateObservationRequest(BaseModel):
    observation_type: Literal[
        "message_history",
        "pagination",
        "image",
        "file",
        "link",
        "red_packet",
        "error",
        "official_api",
    ]
    method: str | None = None
    endpoint_path: str | None = None
    request_fields: dict[str, Any] | list[Any] | None = None
    response_fields: dict[str, Any] | list[Any] | None = None
    sample_payload: dict[str, Any] | list[Any] | None = None
    pagination_fields: dict[str, Any] | list[Any] | None = None
    redaction_notes: str | None = None


def bool_to_int(value: bool | None) -> int | None:
    if value is None:
        return None
    return 1 if value else 0


def parse_json_field(value: str | None) -> Any:
    if value is None:
        return None
    return json.loads(value)


def serialize_json_field(value: dict[str, Any] | list[Any] | None) -> str | None:
    if value is None:
        return None
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True)
    lowered = encoded.lower()
    if any(marker in lowered for marker in SENSITIVE_MARKERS):
        raise HTTPException(
            status_code=400,
            detail="Observation payload contains sensitive auth-like fields. Please redact cookies, tokens, passwords, and authorization headers before saving.",
        )
    return encoded


def report_row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    result = row_to_dict(row)
    for field in (
        "can_login",
        "can_view_group",
        "can_view_history",
        "can_page_history",
        "can_access_images",
        "can_access_files",
        "can_access_links",
        "red_packet_identified",
        "rate_limit_observed",
    ):
        result[field] = bool(result[field])
    return result


def observation_row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    result = row_to_dict(row)
    result["request_fields"] = parse_json_field(result.pop("request_fields_json"))
    result["response_fields"] = parse_json_field(result.pop("response_fields_json"))
    result["sample_payload"] = parse_json_field(result.pop("sample_payload_json"))
    result["pagination_fields"] = parse_json_field(result.pop("pagination_fields_json"))
    return result


def get_report_row(
    connection: sqlite3.Connection,
    report_id: int,
) -> sqlite3.Row:
    row = connection.execute(
        """
        SELECT
            wvr.*,
            wa.display_name AS account_name,
            cg.name AS group_name
        FROM weibo_verification_reports wvr
        JOIN weibo_accounts wa ON wa.id = wvr.account_id
        JOIN chat_groups cg ON cg.id = wvr.group_id
        WHERE wvr.id = ?
        """,
        (report_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Verification report not found")
    return row


def list_report_observations(
    connection: sqlite3.Connection,
    report_id: int,
) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT *
        FROM weibo_interface_observations
        WHERE report_id = ?
        ORDER BY created_at DESC, id DESC
        """,
        (report_id,),
    ).fetchall()
    return [observation_row_to_dict(row) for row in rows]


@router.get("/weibo-verifications")
def list_verification_reports(
    account_id: int | None = None,
    group_id: int | None = None,
    verification_status: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    filters = []
    params: list[Any] = []

    if account_id is not None:
        filters.append("wvr.account_id = ?")
        params.append(account_id)
    if group_id is not None:
        filters.append("wvr.group_id = ?")
        params.append(group_id)
    if verification_status:
        if verification_status not in VALID_VERIFICATION_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid verification status")
        filters.append("wvr.verification_status = ?")
        params.append(verification_status)

    where_sql = f"WHERE {' AND '.join(filters)}" if filters else ""
    total = int(
        connection.execute(
            f"""
            SELECT COUNT(*)
            FROM weibo_verification_reports wvr
            JOIN weibo_accounts wa ON wa.id = wvr.account_id
            JOIN chat_groups cg ON cg.id = wvr.group_id
            {where_sql}
            """,
            params,
        ).fetchone()[0]
    )

    rows = connection.execute(
        f"""
        SELECT
            wvr.*,
            wa.display_name AS account_name,
            cg.name AS group_name,
            COUNT(wio.id) AS observation_count
        FROM weibo_verification_reports wvr
        JOIN weibo_accounts wa ON wa.id = wvr.account_id
        JOIN chat_groups cg ON cg.id = wvr.group_id
        LEFT JOIN weibo_interface_observations wio ON wio.report_id = wvr.id
        {where_sql}
        GROUP BY wvr.id
        ORDER BY wvr.updated_at DESC, wvr.id DESC
        LIMIT ? OFFSET ?
        """,
        [*params, limit, offset],
    ).fetchall()

    return {
        "items": [report_row_to_dict(row) for row in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("/weibo-verifications")
def create_verification_report(
    request: CreateVerificationReportRequest,
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    ensure_account_and_group(connection, request.account_id, request.group_id)
    if request.history_days_checked is not None and request.history_days_checked < 0:
        raise HTTPException(status_code=400, detail="history_days_checked must be >= 0")

    cursor = connection.execute(
        """
        INSERT INTO weibo_verification_reports (
            account_id,
            group_id,
            history_days_checked,
            risk_level,
            verification_status,
            notes
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            request.account_id,
            request.group_id,
            request.history_days_checked,
            request.risk_level,
            request.verification_status,
            request.notes,
        ),
    )
    return get_verification_report(int(cursor.lastrowid), connection)


@router.get("/weibo-verifications/{report_id}")
def get_verification_report(
    report_id: int,
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    result = report_row_to_dict(get_report_row(connection, report_id))
    result["observations"] = list_report_observations(connection, report_id)
    return result


@router.patch("/weibo-verifications/{report_id}")
def update_verification_report(
    report_id: int,
    request: UpdateVerificationReportRequest,
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    get_report_row(connection, report_id)
    if request.history_days_checked is not None and request.history_days_checked < 0:
        raise HTTPException(status_code=400, detail="history_days_checked must be >= 0")
    if request.risk_level is not None and request.risk_level not in VALID_RISK_LEVELS:
        raise HTTPException(status_code=400, detail="Invalid risk level")
    if (
        request.verification_status is not None
        and request.verification_status not in VALID_VERIFICATION_STATUSES
    ):
        raise HTTPException(status_code=400, detail="Invalid verification status")

    update_values = request.model_dump(exclude_unset=True)
    if not update_values:
        return get_verification_report(report_id, connection)

    bool_fields = {
        "can_login",
        "can_view_group",
        "can_view_history",
        "can_page_history",
        "can_access_images",
        "can_access_files",
        "can_access_links",
        "red_packet_identified",
        "rate_limit_observed",
    }
    assignments = []
    params: list[Any] = []
    for key, value in update_values.items():
        assignments.append(f"{key} = ?")
        params.append(bool_to_int(value) if key in bool_fields else value)

    connection.execute(
        f"""
        UPDATE weibo_verification_reports
        SET {', '.join(assignments)},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        [*params, report_id],
    )
    return get_verification_report(report_id, connection)


@router.post("/weibo-verifications/{report_id}/observations")
def create_observation(
    report_id: int,
    request: CreateObservationRequest,
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    get_report_row(connection, report_id)
    if request.observation_type not in VALID_OBSERVATION_TYPES:
        raise HTTPException(status_code=400, detail="Invalid observation type")

    cursor = connection.execute(
        """
        INSERT INTO weibo_interface_observations (
            report_id,
            observation_type,
            method,
            endpoint_path,
            request_fields_json,
            response_fields_json,
            sample_payload_json,
            pagination_fields_json,
            redaction_notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            report_id,
            request.observation_type,
            request.method,
            request.endpoint_path,
            serialize_json_field(request.request_fields),
            serialize_json_field(request.response_fields),
            serialize_json_field(request.sample_payload),
            serialize_json_field(request.pagination_fields),
            request.redaction_notes,
        ),
    )
    connection.execute(
        """
        UPDATE weibo_verification_reports
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (report_id,),
    )
    row = connection.execute(
        "SELECT * FROM weibo_interface_observations WHERE id = ?",
        (int(cursor.lastrowid),),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=500, detail="Observation was not created")
    return observation_row_to_dict(row)

