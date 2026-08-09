from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_env: str = "development"
    database_path: Path = PROJECT_ROOT / "data" / "weibo_chat_collector.sqlite3"
    attachments_dir: Path = PROJECT_ROOT / "data" / "attachments"
    imports_dir: Path = PROJECT_ROOT / "data" / "imports"
    weibo_api_auth_dir: Path = PROJECT_ROOT / "data" / "auth"
    default_collection_days: int = 7
    delete_mode: str = "soft"
    weibo_api_timezone: str = "Asia/Shanghai"
    weibo_api_page_size: int = 20
    weibo_api_max_pages: int = 500
    weibo_api_page_delay_seconds: float = 0.3
    weibo_api_request_timeout_seconds: float = 30.0
    weibo_api_max_retries: int = 2
    weibo_api_retry_base_seconds: float = 1.0

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
    )

    @field_validator(
        "database_path",
        "attachments_dir",
        "imports_dir",
        "weibo_api_auth_dir",
        mode="after",
    )
    @classmethod
    def resolve_project_path(cls, value: Path) -> Path:
        if value.is_absolute():
            return value
        return (PROJECT_ROOT / value).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
