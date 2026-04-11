from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.database import get_db_session
from app.db.models import User
from app.schemas.user_schema import AuthResponse, GoogleLoginRequest, UserRead
from app.utils.auth import create_access_token, get_current_user, verify_google_id_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google-login", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def google_login(
    payload: GoogleLoginRequest,
    db_session: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    google_profile = verify_google_id_token(payload.id_token)
    user = await crud.get_or_create_user(
        db_session,
        email=google_profile["email"],
        name=google_profile.get("name") or google_profile["email"],
    )

    return AuthResponse(
        access_token=create_access_token(str(user.id)),
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead, status_code=status.HTTP_200_OK)
async def get_current_analyst(
    current_user: User = Depends(get_current_user),
) -> UserRead:
    return UserRead.model_validate(current_user)
