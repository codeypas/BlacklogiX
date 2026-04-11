from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db_session
from app.db.models import User
from app.schemas.chat_schema import (
    ChatMessageResponse,
    ChatSessionCreateRequest,
    ChatSessionDetailResponse,
    ChatSessionRead,
    MessageCreateRequest,
)
from app.services.chat_service import chat_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/session", response_model=ChatSessionRead, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    payload: ChatSessionCreateRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ChatSessionRead:
    chat_session = await chat_service.create_session(db_session, current_user, payload)
    return ChatSessionRead.model_validate(chat_session)


@router.get("/sessions", response_model=list[ChatSessionRead], status_code=status.HTTP_200_OK)
async def list_chat_sessions(
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[ChatSessionRead]:
    sessions = await chat_service.list_sessions(db_session, current_user)
    return [ChatSessionRead.model_validate(session) for session in sessions]


@router.get("/session/{session_id}", response_model=ChatSessionDetailResponse, status_code=status.HTTP_200_OK)
async def get_chat_session_detail(
    session_id: str,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ChatSessionDetailResponse:
    return await chat_service.get_session_detail(db_session, current_user, session_id)


@router.post("/message", response_model=ChatMessageResponse, status_code=status.HTTP_200_OK)
async def create_chat_message(
    payload: MessageCreateRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ChatMessageResponse:
    return await chat_service.send_message(
        db_session,
        current_user,
        str(payload.session_id),
        payload.message,
    )
