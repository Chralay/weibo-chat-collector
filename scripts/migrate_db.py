import argparse
import sqlite3
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "weibo_chat_collector.sqlite3"
SCHEMA_PATH = PROJECT_ROOT / "scripts" / "schema.sql"


def migrate_database(db_path: Path) -> list[str]:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    schema = SCHEMA_PATH.read_text(encoding="utf-8")

    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript(schema)
        rows = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name
            """
        ).fetchall()
        return [row[0] for row in rows]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply idempotent SQLite schema migrations.")
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help="SQLite database path.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    tables = migrate_database(args.db)
    print(f"Database migrated at {args.db}")
    print("Tables:")
    for table_name in tables:
        print(f"- {table_name}")
