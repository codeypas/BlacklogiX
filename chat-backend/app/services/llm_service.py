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
Use the current conversation history only. Do not invent account data, alert records, or
session details that are not present in the chat.
""".strip()


class LLMService:
    def __init__(self) -> None:
        self._llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.gemini_api_key,
            temperature=0.3,
        )

    @staticmethod
    def _to_langchain_messages(messages: List[Message]) -> List[object]:
        conversation: List[object] = [SystemMessage(content=SYSTEM_PROMPT)]
        for message in messages:
            if message.role == "user":
                conversation.append(HumanMessage(content=message.content))
            else:
                conversation.append(AIMessage(content=message.content))
        return conversation

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

    async def generate_reply(self, messages: List[Message]) -> str:
        try:
            result = await self._llm.ainvoke(self._to_langchain_messages(messages))
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini failed to generate a response",
            ) from exc

        response_text = self._normalize_content(result.content)
        if not response_text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini returned an empty response",
            )

        return response_text


llm_service = LLMService()
