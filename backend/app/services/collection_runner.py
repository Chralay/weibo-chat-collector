from dataclasses import asdict, dataclass
from datetime import datetime
import sqlite3
from typing import Any, Iterable

from ..collectors.base import CollectionCandidate
from ..importer import (
    build_content_hash,
    ensure_group_member,
    ensure_user,
    insert_attachments,
    insert_message,
    is_duplicate_message,
    is_red_packet,
)


@dataclass(slots=True)
class ApiCollectionSummary:
    collection_job_id: int
    source_total_count: int = 0
    total_count: int = 0
    inserted_count: int = 0
    skipped_count: int = 0
    red_packet_count: int = 0
    duplicate_count: int = 0
    attachment_count: int = 0
    invalid_count: int = 0
    page_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def create_running_api_job(
    connection: sqlite3.Connection,
    *,
    account_id: int,
    group_id: int,
    range_start: datetime,
    range_end: datetime,
) -> int:
    cursor = connection.execute(
        """
        INSERT INTO collection_jobs (
            account_id,
            group_id,
            range_start,
            range_end,
            status,
            started_at,
            collector_type
        )
        VALUES (?, ?, ?, ?, 'running', CURRENT_TIMESTAMP, 'weibo_api_v1')
        """,
        (
            account_id,
            group_id,
            range_start.strftime("%Y-%m-%d %H:%M:%S"),
            range_end.strftime("%Y-%m-%d %H:%M:%S"),
        ),
    )
    return int(cursor.lastrowid)


def mark_api_job_failed(
    connection: sqlite3.Connection,
    collection_job_id: int,
    error_message: str,
) -> None:
    connection.execute(
        """
        UPDATE collection_jobs
        SET status = 'failed',
            finished_at = CURRENT_TIMESTAMP,
            failed_count = CASE WHEN failed_count < 1 THEN 1 ELSE failed_count END,
            error_message = ?
        WHERE id = ?
        """,
        (error_message[:1000], collection_job_id),
    )


def ingest_api_candidates(
    connection: sqlite3.Connection,
    *,
    collection_job_id: int,
    account_id: int,
    group_id: int,
    candidates: Iterable[CollectionCandidate],
    source_total_count: int | None = None,
    page_count: int = 0,
) -> ApiCollectionSummary:
    materialized = sorted(candidates, key=lambda candidate: candidate.sent_at)
    summary = ApiCollectionSummary(
        collection_job_id=collection_job_id,
        source_total_count=(
            source_total_count if source_total_count is not None else len(materialized)
        ),
        total_count=len(materialized),
        page_count=page_count,
    )

    for candidate in materialized:
        message = candidate_to_message(candidate, account_id=account_id, group_id=group_id)
        if candidate.is_red_packet or is_red_packet(message):
            summary.red_packet_count += 1
            summary.skipped_count += 1
            continue

        user_id = ensure_user(connection, message)
        ensure_group_member(connection, group_id, user_id, message)
        content_hash = build_content_hash(message)
        if is_duplicate_message(
            connection,
            account_id,
            group_id,
            user_id,
            message,
            content_hash,
        ):
            summary.duplicate_count += 1
            summary.skipped_count += 1
            continue

        message_id = insert_message(
            connection,
            account_id,
            group_id,
            user_id,
            collection_job_id,
            message,
            content_hash,
        )
        summary.attachment_count += insert_attachments(
            connection,
            message_id,
            message["attachments"],
            attachments_dir=None,
            copy_local_attachments=False,
        )
        summary.inserted_count += 1

    connection.execute(
        """
        UPDATE collection_jobs
        SET status = 'completed',
            finished_at = CURRENT_TIMESTAMP,
            total_seen_count = ?,
            inserted_count = ?,
            skipped_count = ?,
            failed_count = ?,
            error_message = NULL
        WHERE id = ?
        """,
        (
            summary.total_count,
            summary.inserted_count,
            summary.skipped_count,
            summary.invalid_count,
            collection_job_id,
        ),
    )
    return summary


def candidate_to_message(
    candidate: CollectionCandidate,
    *,
    account_id: int,
    group_id: int,
) -> dict[str, Any]:
    return {
        "account_id": account_id,
        "group_id": group_id,
        "source_message_id": candidate.source_message_id,
        "source_user_id": candidate.source_user_id,
        "sender_name": candidate.sender_name,
        "avatar_url": getattr(candidate, "sender_avatar_url", None),
        "sent_at": candidate.sent_at.strftime("%Y-%m-%d %H:%M:%S"),
        "message_type": candidate.message_type,
        "content_text": candidate.content_text or "",
        "raw_payload": candidate.raw_payload,
        "is_red_packet": candidate.is_red_packet,
        "is_system_message": candidate.is_system_message,
        "attachments": [asdict(attachment) for attachment in candidate.attachments],
    }
