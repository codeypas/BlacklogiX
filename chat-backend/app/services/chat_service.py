from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.models import ChatSession, MessageRole, User
from app.schemas.chat_schema import (
    ChatMessageResponse,
    ChatSessionCreateRequest,
    ChatSessionDetailResponse,
    ChatSessionRead,
)
from app.services.llm_service import llm_service


class ChatService:
    @staticmethod
    def _derive_title(message: str) -> str:
        normalized = " ".join(message.split()).strip()
        if not normalized:
            return "New Chat"
        max_length = 60
        if len(normalized) <= max_length:
            return normalized
        return normalized[: max_length - 3].rstrip() + "..."

    async def create_session(
        self,
        db_session: AsyncSession,
        user: User,
        payload: ChatSessionCreateRequest,
    ) -> ChatSession:
        title = (payload.title or "").strip() or "New Chat"
        return await crud.create_chat_session(db_session, user_id=user.id, title=title)

    async def list_sessions(self, db_session: AsyncSession, user: User) -> list[ChatSession]:
        return await crud.list_chat_sessions_for_user(db_session, user_id=user.id)

    async def get_session_detail(
        self,
        db_session: AsyncSession,
        user: User,
        session_id: str,
    ) -> ChatSessionDetailResponse:
        chat_session = await crud.get_chat_session_for_user(db_session, session_id, user.id)
        if chat_session is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

        messages = await crud.list_messages_for_session(db_session, session_id)
        return ChatSessionDetailResponse(
            session=ChatSessionRead.model_validate(chat_session),
            messages=[message for message in messages],
        )

    async def send_message(
        self,
        db_session: AsyncSession,
        user: User,
        session_id: str,
        message: str,
    ) -> ChatMessageResponse:
        chat_session = await crud.get_chat_session_for_user(db_session, session_id, user.id)
        if chat_session is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

        cleaned_message = message.strip()
        if not cleaned_message:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message cannot be empty")

        user_message = await crud.create_message(
            db_session,
            session_id=session_id,
            role=MessageRole.USER,
            content=cleaned_message,
        )

        history = await crud.list_messages_for_session(db_session, session_id)

        if chat_session.title == "New Chat":
            user_message_count = sum(1 for item in history if item.role == MessageRole.USER.value)
            if user_message_count == 1:
                chat_session = await crud.update_chat_session_title(
                    db_session,
                    chat_session,
                    self._derive_title(cleaned_message),
                )

        assistant_text = await llm_service.generate_reply(history)
        assistant_message = await crud.create_message(
            db_session,
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=assistant_text,
        )

        return ChatMessageResponse(
            session_id=chat_session.id,
            session_title=chat_session.title,
            user_message=user_message,
            assistant_message=assistant_message,
        )


chat_service = ChatService()
