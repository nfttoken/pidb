from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PIDB API"
    app_env: str = "development"
    debug: bool = False
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+asyncpg://pidb:pidb@localhost:5432/pidb"
    jwt_secret_key: str = Field(
        default="development-only-secret-change-me-before-deployment-123456",
        min_length=32,
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    refresh_cookie_name: str = "pidb_refresh_token"
    frontend_origins: list[str] = ["http://localhost:5173"]
    public_base_url: str = "http://localhost:5173"
    shopify_store_domain: str = ""
    shopify_storefront_url: str = ""
    shopify_admin_access_token: str = ""
    shopify_api_version: str = "2025-01"
    shopify_timeout_seconds: float = 20.0
    shopify_max_attempts: int = 3

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
