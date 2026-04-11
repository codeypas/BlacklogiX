from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import List

from dotenv import load_dotenv

load_dotenv()


def _get_env(name: str, default: str = "", required: bool = False) -> str:
    value = os.getenv(name, default).strip()
    if required and not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _get_int(name: str, default: int) -> int:
    raw_value = _get_env(name, str(default))
    try:
        return int(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"Environment variable {name} must be an integer") from exc


def _get_cors_origins() -> List[str]:
    raw_origins = _get_env("CORS_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    app_env: str
    app_host: str
    app_port: int
    database_url: str
    google_client_id: str
    jwt_secret: str
    jwt_expires_hours: int
    gemini_api_key: str
    gemini_model: str
    cors_origins: List[str]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        app_env=_get_env("APP_ENV", "development"),
        app_host=_get_env("APP_HOST", "0.0.0.0"),
        app_port=_get_int("APP_PORT", 8000),
        database_url=_get_env(
            "DATABASE_URL",
            "postgresql+psycopg://blacklogix:blacklogix@chat-postgres:5432/blacklogix_chat",
            required=True,
        ),
        google_client_id=_get_env("GOOGLE_CLIENT_ID", required=True),
        jwt_secret=_get_env("JWT_SECRET", required=True),
        jwt_expires_hours=_get_int("JWT_EXPIRES_HOURS", 168),
        gemini_api_key=_get_env("GEMINI_API_KEY", required=True),
        gemini_model=_get_env("GEMINI_MODEL", "gemini-1.5-pro", required=True),
        cors_origins=_get_cors_origins(),
    )


settings = get_settings()
