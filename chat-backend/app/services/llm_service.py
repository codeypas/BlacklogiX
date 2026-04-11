from __future__ import annotations

from typing import List

from fastapi import HTTPException, status
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.db.models import Message


SYSTEM_PROMPT = """
You are the BlackLogix AI assistant.

You help users with security analytics conversations in a clear, concise, and helpful way.
Use the current conversation history and any provided investigation context only.
Do not invent account data, alert records, event details, or integrity evidence that are
not present in the chat or the supplied context.
If context is partial, say what is known and what is still missing.
""".strip()


class LLMService:
    def __init__(self) -> None:
        self._llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.gemini_api_key,
            temperature=0.3,
        )

    @staticmethod
    def _to_langchain_messages(messages: List[Message], *, context_summary: str | None = None) -> List[object]:
        conversation: List[object] = [SystemMessage(content=SYSTEM_PROMPT)]
        if context_summary:
            conversation.append(SystemMessage(content=context_summary))
        for message in messages:
            if message.role == "user":
                conversation.append(HumanMessage(content=message.content))
            else:
                conversation.append(AIMessage(content=message.content))
        return conversation

    @staticmethod
    def _describe_exception(exc: Exception) -> str:
        detail = " ".join(str(exc).split()).strip()
        if not detail:
            return exc.__class__.__name__
        if len(detail) <= 180:
            return detail
        return detail[:177].rstrip() + "..."

    @staticmethod
    def _normalize_content(content: object) -> str:
        if isinstance(content, str):
            return content.strip()
        if isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, dict) and "text" in item:
                    parts.append(str(item["text"]))
                else:
                    parts.append(str(item))
            return "\n".join(parts).strip()
        return str(content).strip()

    async def generate_reply(self, messages: List[Message], *, context_summary: str | None = None) -> str:
        try:
            result = await self._llm.ainvoke(self._to_langchain_messages(messages, context_summary=context_summary))
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini failed to generate a response: {self._describe_exception(exc)}",
            ) from exc

        response_text = self._normalize_content(result.content)
        if not response_text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini returned an empty response",
            )

        return response_text


llm_service = LLMService()
