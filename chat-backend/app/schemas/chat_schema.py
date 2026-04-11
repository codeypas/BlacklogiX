from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ChatSessionCreateRequest(BaseModel):
    title: Optional[str] = None
    project_id: UUID | None = None
    alert_id: UUID | None = None
    event_id: UUID | None = None


class MessageCreateRequest(BaseModel):
    session_id: UUID
    message: str = Field(min_length=1)


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: str
    content: str
    timestamp: datetime


class ChatSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    project_id: UUID | None = None
    title: str
    context_json: dict = Field(default_factory=dict)
    created_at: datetime


class ChatSessionDetailResponse(BaseModel):
    session: ChatSessionRead
    messages: List[MessageRead]


class ChatMessageResponse(BaseModel):
    session_id: UUID
    session_title: str
    user_message: MessageRead
    assistant_message: MessageRead
