from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_path: Path = Path("./data/weibo_chat_collector.sqlite3")
    attachments_dir: Path = Path("./data/attachments")
    imports_dir: Path = Path("./data/imports")
    default_collection_days: int = 7
    delete_mode: str = "soft"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()

