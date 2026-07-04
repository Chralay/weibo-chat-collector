import argparse
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PROJECT_ROOT / "backend"
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "weibo_chat_collector.sqlite3"
DEFAULT_ATTACHMENTS_DIR = PROJECT_ROOT / "data" / "attachments"

sys.path.insert(0, str(BACKEND_ROOT))

from app.importer import import_file  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import chat messages from JSON or CSV.")
    parser.add_argument("source", type=Path, help="JSON or CSV import file.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="SQLite DB path.")
    parser.add_argument("--account", help="Account name override.")
    parser.add_argument("--group", help="Group name override.")
    parser.add_argument(
        "--attachments-dir",
        type=Path,
        default=DEFAULT_ATTACHMENTS_DIR,
        help="Directory for stored attachment originals.",
    )
    parser.add_argument(
        "--copy-local-attachments",
        action="store_true",
        help="Copy local attachment files into the attachments directory.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    summary = import_file(
        db_path=args.db,
        source_path=args.source,
        account_name=args.account,
        group_name=args.group,
        attachments_dir=args.attachments_dir,
        copy_local_attachments=args.copy_local_attachments,
    )
    print(f"source_file: {summary.source_file}")
    print(f"account: {summary.account}")
    print(f"group: {summary.group}")
    print(f"total_count: {summary.total_count}")
    print(f"inserted_count: {summary.inserted_count}")
    print(f"skipped_count: {summary.skipped_count}")
    print(f"red_packet_count: {summary.red_packet_count}")
    print(f"duplicate_count: {summary.duplicate_count}")
    print(f"attachment_count: {summary.attachment_count}")

