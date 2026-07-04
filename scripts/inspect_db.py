import argparse
import sqlite3
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "weibo_chat_collector.sqlite3"


def inspect_database(db_path: Path) -> None:
    with sqlite3.connect(db_path) as connection:
        tables = [
            row[0]
            for row in connection.execute(
                """
                SELECT name
                FROM sqlite_master
                WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
                """
            )
        ]
        accounts = [
            row[0]
            for row in connection.execute(
                "SELECT display_name FROM weibo_accounts ORDER BY id"
            )
        ]
        groups = [
            row[0]
            for row in connection.execute("SELECT name FROM chat_groups ORDER BY id")
        ]
        message_count = connection.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
        attachment_count = connection.execute("SELECT COUNT(*) FROM attachments").fetchone()[0]
        import_count = connection.execute("SELECT COUNT(*) FROM import_batches").fetchone()[0]

    print("tables: " + ", ".join(tables))
    print("accounts: " + ", ".join(accounts))
    print("groups: " + ", ".join(groups))
    print(f"messages: {message_count}")
    print(f"attachments: {attachment_count}")
    print(f"import_batches: {import_count}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inspect the local SQLite database.")
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help="SQLite database path.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    inspect_database(args.db)
