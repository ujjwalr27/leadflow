"""Application settings, loaded from environment variables (and an optional `.env` file)."""

import logging
from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

logger = logging.getLogger(__name__)

DEV_JWT_SECRET = "dev-only-insecure-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "LeadFlow API"
    database_url: str = "postgresql+psycopg://leadflow:leadflow@localhost:5432/leadflow"
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]
    log_level: str = "info"

    # ─── Authentication ───────────────────────────────────────────────────
    # Signs session tokens. MUST be overridden outside local development.
    jwt_secret_key: str = Field(default=DEV_JWT_SECRET, min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    auth_cookie_name: str = "leadflow_session"
    # Send the session cookie over HTTPS only (enable in production).
    cookie_secure: bool = False

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        """Accept a comma-separated string such as `http://a.com,http://b.com`."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.jwt_secret_key == DEV_JWT_SECRET:
        logger.warning("JWT_SECRET_KEY is not set; using an insecure development secret.")
    return settings
