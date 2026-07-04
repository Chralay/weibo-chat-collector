import argparse
import sqlite3
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "weibo_chat_collector.sqlite3"


def configure_first_target(db_path: Path, account_name: str, group_name: str) -> tuple[int, int]:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON")

        account_row = connection.execute(
            "SELECT id FROM weibo_accounts WHERE display_name = ?",
            (account_name,),
        ).fetchone()
        if account_row:
            account_id = int(account_row[0])
        else:
            placeholder = connection.execute(
                "SELECT id FROM weibo_accounts WHERE display_name = 'account_a'",
            ).fetchone()
            if placeholder:
                account_id = int(placeholder[0])
                connection.execute(
                    """
                    UPDATE weibo_accounts
                    SET display_name = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (account_name, account_id),
                )
            else:
                cursor = connection.execute(
                    "INSERT INTO weibo_accounts (display_name, notes) VALUES (?, ?)",
                    (account_name, "First Weibo account configured for browser-assisted capture."),
                )
                account_id = int(cursor.lastrowid)

        group_row = connection.execute(
            """
            SELECT id
            FROM chat_groups
            WHERE account_id = ? AND name = ?
            """,
            (account_id, group_name),
        ).fetchone()
        if group_row:
            group_id = int(group_row[0])
        else:
            placeholder_group = connection.execute(
                """
                SELECT id
                FROM chat_groups
                WHERE account_id = ? AND name = 'group_a'
                """,
                (account_id,),
            ).fetchone()
            if placeholder_group:
                group_id = int(placeholder_group[0])
                connection.execute(
                    """
                    UPDATE chat_groups
                    SET name = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (group_name, group_id),
                )
            else:
                cursor = connection.execute(
                    """
                    INSERT INTO chat_groups (account_id, name, description)
                    VALUES (?, ?, ?)
                    """,
                    (account_id, group_name, "First Weibo group configured for capture."),
                )
                group_id = int(cursor.lastrowid)

    return account_id, group_id


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Configure the first Weibo account and group.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="SQLite database path.")
    parser.add_argument("--account-name", default="微博账号A", help="Account display name.")
    parser.add_argument("--group-name", default="汉语从句研究会", help="Group display name.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    account_id, group_id = configure_first_target(args.db, args.account_name, args.group_name)
    print(f"account_id: {account_id}")
    print(f"group_id: {group_id}")
