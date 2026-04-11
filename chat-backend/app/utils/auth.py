from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from jwt import InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import crud
from app.db.database import get_db_session
from app.db.models import IngestionSource, User

bearer_scheme = HTTPBearer(auto_error=False)
SOURCE_API_KEY_PREFIX = "blx_src_"


def verify_google_id_token(google_id_token: str) -> Dict[str, Any]:
    try:
        payload = id_token.verify_oauth2_token(
            google_id_token,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        ) from exc

    if not payload.get("email"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account did not provide an email address",
        )

    return payload


def create_access_token(user_id: str) -> str:
    expires_at = datetime.now(tz=timezone.utc) + timedelta(hours=settings.jwt_expires_hours)
    payload = {
        "sub": str(user_id),
        "exp": expires_at,
        "iat": datetime.now(tz=timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
        ) from exc


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db_session: AsyncSession = Depends(get_db_session),
) -> Optional[User]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    email = payload.get("email")
    name = payload.get("name")

    if not user_id and not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token payload",
        )

    user = None
    if user_id:
        user = await crud.get_user_by_id(db_session, user_id)

    if user is None and email:
        user = await crud.get_or_create_user(
            db_session,
            email=email,
            name=name or email,
        )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found for the provided token",
        )

    return user


async def get_current_user(
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> User:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return current_user


def generate_source_api_key() -> str:
    return f"{SOURCE_API_KEY_PREFIX}{secrets.token_urlsafe(24)}"


def hash_source_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def get_source_api_key_prefix(api_key: str) -> str:
    if len(api_key) <= 16:
        return api_key
    return api_key[:16]


async def get_source_from_api_key(
    *,
    api_key: str,
    db_session: AsyncSession,
) -> Optional[IngestionSource]:
    normalized_key = api_key.strip()
    if not normalized_key:
        return None
    return await crud.get_source_by_api_key_hash(
        db_session,
        hash_source_api_key(normalized_key),
    )
