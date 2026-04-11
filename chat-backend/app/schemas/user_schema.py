from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class GoogleLoginRequest(BaseModel):
    id_token: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    name: str
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserRead
