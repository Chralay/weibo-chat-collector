import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..collectors.local_file import collect_single_group_from_file
from ..database import get_connection
from ..settings import get_settings
from .collection_jobs import ensure_account_and_group, get_collection_job


router = APIRouter(prefix="/api", tags=["single-group-collection"])

SUPPORTED_IMPORT_SUFFIXES = {".json", ".csv"}


class RunSingleGroupFileCollectionRequest(BaseModel):
    account_id: int
    group_id: int
    range_start: str
    range_end: str
    source_file: str
    copy_local_attachments: bool = True


def get_safe_import_path(source_file: str) -> Path:
    settings = get_settings()
    imports_dir = settings.imports_dir.resolve()
    candidate = Path(source_file)
    if candidate.is_absolute():
        raise HTTPException(status_code=400, detail="source_file must be relative to imports dir")

    resolved = (imports_dir / candidate).resolve()
    try:
        resolved.relative_to(imports_dir)
    except ValueError as error:
        raise HTTPException(status_code=400, detail="source_file is outside imports dir") from error

    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="Import file not found")
    if resolved.suffix.lower() not in SUPPORTED_IMPORT_SUFFIXES:
        raise HTTPException(status_code=400, detail="Only JSON and CSV import files are supported")
    return resolved


@router.get("/import-files")
def list_import_files() -> dict[str, Any]:
    imports_dir = get_settings().imports_dir
    imports_dir.mkdir(parents=True, exist_ok=True)
    items = []
    for path in sorted(imports_dir.iterdir(), key=lambda item: item.stat().st_mtime, reverse=True):
        if not path.is_file() or path.suffix.lower() not in SUPPORTED_IMPORT_SUFFIXES:
            continue
        stat = path.stat()
        items.append(
            {
                "name": path.name,
                "relative_path": path.name,
                "size": stat.st_size,
                "modified_at": datetime.fromtimestamp(stat.st_mtime).strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),
            }
        )
    return {"items": items, "total": len(items)}


@router.post("/collection-jobs/single-group-file")
def run_single_group_file_collection(
    request: RunSingleGroupFileCollectionRequest,
    connection: sqlite3.Connection = Depends(get_connection),
) -> dict[str, Any]:
    account, group = ensure_account_and_group(
        connection,
        request.account_id,
        request.group_id,
    )
    source_path = get_safe_import_path(request.source_file)

    try:
        summary = collect_single_group_from_file(
            connection,
            account_id=request.account_id,
            account_name=account["display_name"],
            group_id=request.group_id,
            group_name=group["name"],
            source_path=source_path,
            range_start=request.range_start,
            range_end=request.range_end,
            attachments_dir=get_settings().attachments_dir,
            copy_local_attachments=request.copy_local_attachments,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {
        "summary": summary.to_dict(),
        "job": get_collection_job(summary.collection_job_id, connection),
    }
