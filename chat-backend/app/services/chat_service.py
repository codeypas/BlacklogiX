from __future__ import annotations

from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.models import AIEvent, Alert, ChatSession, MessageRole, Project, SystemEvent, User
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

    @staticmethod
    def _truncate(value: str | None, *, limit: int = 280) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split()).strip()
        if len(normalized) <= limit:
            return normalized
        return normalized[: limit - 3].rstrip() + "..."

    def _serialize_alert_context(self, alert: Alert) -> dict:
        return {
            "id": str(alert.id),
            "title": alert.title,
            "description": self._truncate(alert.description, limit=360),
            "severity": alert.severity,
            "status": alert.status,
            "score": alert.score,
            "source_name": alert.source.name if alert.source else "Unknown source",
            "source_type": alert.source.type if alert.source else "unknown",
            "event_kind": "ai" if alert.ai_event_id else "system",
            "event_id": str(alert.ai_event_id or alert.system_event_id) if (alert.ai_event_id or alert.system_event_id) else None,
            "metadata": alert.metadata_json or {},
        }

    def _serialize_ai_event_context(self, event: AIEvent) -> dict:
        return {
            "id": str(event.id),
            "kind": "ai",
            "source_name": event.source.name if event.source else "Unknown source",
            "source_type": event.source.type if event.source else "ai_application",
            "event_type": event.event_type,
            "timestamp": event.timestamp.isoformat(),
            "model_name": event.model_name,
            "model_version": event.model_version,
            "confidence_score": event.confidence_score,
            "prompt": self._truncate(event.prompt, limit=500),
            "response": self._truncate(event.response, limit=500),
            "metadata": event.metadata_json or {},
            "chain_hash": event.chain_hash,
        }

    def _serialize_system_event_context(self, event: SystemEvent) -> dict:
        return {
            "id": str(event.id),
            "kind": "system",
            "source_name": event.source.name if event.source else "Unknown source",
            "source_type": event.source.type if event.source else "system_logs",
            "event_type": event.event_name,
            "timestamp": event.timestamp.isoformat(),
            "service": event.service,
            "level": event.level,
            "metadata": event.metadata_json or {},
            "chain_hash": event.chain_hash,
        }

    @staticmethod
    def _serialize_recent_evidence(events: Sequence[AIEvent | SystemEvent]) -> list[dict]:
        items: list[dict] = []
        for event in events:
            is_ai_event = isinstance(event, AIEvent)
            items.append(
                {
                    "id": str(event.id),
                    "kind": "ai" if is_ai_event else "system",
                    "label": event.event_type if is_ai_event else event.event_name,
                    "source_name": event.source.name if event.source else "Unknown source",
                    "timestamp": event.timestamp.isoformat(),
                    "chain_hash": event.chain_hash,
                }
            )
        return items

    async def create_session(
        self,
        db_session: AsyncSession,
        user: User,
        payload: ChatSessionCreateRequest,
    ) -> ChatSession:
        title = (payload.title or "").strip() or "New Chat"
        context_json = await self._build_context_json(
            db_session,
            user=user,
            project_id=str(payload.project_id) if payload.project_id else None,
            alert_id=str(payload.alert_id) if payload.alert_id else None,
            event_id=str(payload.event_id) if payload.event_id else None,
        )
        return await crud.create_chat_session(
            db_session,
            user_id=user.id,
            title=title,
            project_id=context_json.get("project_id"),
            context_json=context_json,
        )

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

        assistant_text = await llm_service.generate_reply(
            history,
            context_summary=self._build_context_prompt(chat_session),
        )
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

    async def _build_context_json(
        self,
        db_session: AsyncSession,
        *,
        user: User,
        project_id: str | None,
        alert_id: str | None,
        event_id: str | None,
    ) -> dict:
        context: dict = {}
        project: Project | None = None
        active_alert: Alert | None = None
        active_ai_event: AIEvent | None = None
        active_system_event: SystemEvent | None = None

        if project_id:
            project = await crud.get_project_for_user(db_session, project_id, str(user.id))
            if project is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found or inaccessible",
                )
            context["project_id"] = str(project.id)
            context["project_name"] = project.name
            context["project_snapshot"] = await self._build_project_snapshot(
                db_session,
                user=user,
                project=project,
            )

        if alert_id:
            alert = await crud.get_alert_for_user(db_session, alert_id=alert_id, user_id=str(user.id))
            if alert is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Alert not found or inaccessible",
                )
            if project and str(alert.project_id) != str(project.id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Alert does not belong to the selected project",
                )

            context["project_id"] = str(alert.project_id)
            if project is None:
                project = await crud.get_project_for_user(db_session, str(alert.project_id), str(user.id))
            if project is not None:
                context["project_name"] = project.name
                context["project_snapshot"] = await self._build_project_snapshot(
                    db_session,
                    user=user,
                    project=project,
                )
            active_alert = alert
            context["alert"] = self._serialize_alert_context(alert)

        if event_id:
            active_ai_event = await crud.get_ai_event_for_user(
                db_session,
                event_id=event_id,
                user_id=str(user.id),
            )
            if active_ai_event is None:
                active_system_event = await crud.get_system_event_for_user(
                    db_session,
                    event_id=event_id,
                    user_id=str(user.id),
                )

            event = active_ai_event or active_system_event
            if event is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Event not found or inaccessible",
                )

            if project and str(event.project_id) != str(project.id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Event does not belong to the selected project",
                )

            context["project_id"] = str(event.project_id)
            if project is None:
                project = await crud.get_project_for_user(db_session, str(event.project_id), str(user.id))
            if project is not None:
                context["project_name"] = project.name
                context["project_snapshot"] = await self._build_project_snapshot(
                    db_session,
                    user=user,
                    project=project,
                )

        if active_alert and "event" not in context:
            linked_event_id = active_alert.ai_event_id or active_alert.system_event_id
            if linked_event_id:
                active_ai_event = await crud.get_ai_event_for_user(
                    db_session,
                    event_id=str(linked_event_id),
                    user_id=str(user.id),
                )
                if active_ai_event is None:
                    active_system_event = await crud.get_system_event_for_user(
                        db_session,
                        event_id=str(linked_event_id),
                        user_id=str(user.id),
                    )

        if active_ai_event is None and active_system_event is None and project is not None:
            recent_ai_events = await crud.list_ai_events_for_user(
                db_session,
                user_id=str(user.id),
                project_id=str(project.id),
                limit=1,
            )
            recent_system_events = await crud.list_system_events_for_user(
                db_session,
                user_id=str(user.id),
                project_id=str(project.id),
                limit=1,
            )
            latest_ai_event = recent_ai_events[0] if recent_ai_events else None
            latest_system_event = recent_system_events[0] if recent_system_events else None
            if latest_ai_event and (
                latest_system_event is None or latest_ai_event.timestamp >= latest_system_event.timestamp
            ):
                active_ai_event = latest_ai_event
            elif latest_system_event is not None:
                active_system_event = latest_system_event

        if active_alert is None and project is not None:
            recent_alerts = await crud.list_alerts_for_user(
                db_session,
                user_id=str(user.id),
                project_id=str(project.id),
                limit=1,
            )
            if recent_alerts:
                active_alert = recent_alerts[0]
                context["alert"] = self._serialize_alert_context(active_alert)

        if active_ai_event is not None:
            context["event"] = self._serialize_ai_event_context(active_ai_event)
        elif active_system_event is not None:
            context["event"] = self._serialize_system_event_context(active_system_event)

        return context

    async def _build_project_snapshot(
        self,
        db_session: AsyncSession,
        *,
        user: User,
        project: Project,
    ) -> dict:
        ai_events = await crud.count_ai_events_for_project(db_session, project_id=str(project.id))
        system_events = await crud.count_system_events_for_project(db_session, project_id=str(project.id))
        total_alerts = await crud.count_alerts_for_project(db_session, project_id=str(project.id))
        open_alerts = await crud.count_alerts_for_project(
            db_session,
            project_id=str(project.id),
            status="open",
        )
        critical_alerts = await crud.count_alerts_for_project(
            db_session,
            project_id=str(project.id),
            severity="critical",
        )
        recent_alerts = await crud.list_alerts_for_user(
            db_session,
            user_id=str(user.id),
            project_id=str(project.id),
            limit=3,
        )
        recent_ai_events = await crud.list_ai_events_for_user(
            db_session,
            user_id=str(user.id),
            project_id=str(project.id),
            limit=3,
        )
        recent_system_events = await crud.list_system_events_for_user(
            db_session,
            user_id=str(user.id),
            project_id=str(project.id),
            limit=3,
        )

        combined_recent_events = sorted(
            [*recent_ai_events, *recent_system_events],
            key=lambda item: item.timestamp,
            reverse=True,
        )[:3]

        return {
            "total_events": ai_events + system_events,
            "ai_events": ai_events,
            "system_events": system_events,
            "total_alerts": total_alerts,
            "open_alerts": open_alerts,
            "critical_alerts": critical_alerts,
            "recent_alerts": [
                {
                    "title": alert.title,
                    "severity": alert.severity,
                    "status": alert.status,
                    "score": alert.score,
                }
                for alert in recent_alerts
            ],
            "recent_events": self._serialize_recent_evidence(combined_recent_events),
        }

    def _build_context_prompt(self, chat_session: ChatSession) -> str | None:
        context = chat_session.context_json or {}
        if not context:
            return None

        lines = [
            "Active BlackLogix investigation context:",
        ]

        project_name = context.get("project_name")
        project_id = context.get("project_id")
        if project_name or project_id:
            lines.append(f"- Project: {project_name or 'Unknown'} ({project_id or 'no-id'})")

        project_snapshot = context.get("project_snapshot")
        if isinstance(project_snapshot, dict):
            lines.append("- Project snapshot:")
            lines.append(
                f"  Events: {project_snapshot.get('total_events')} total ({project_snapshot.get('ai_events')} AI / {project_snapshot.get('system_events')} system)"
            )
            lines.append(
                f"  Alerts: {project_snapshot.get('total_alerts')} total, {project_snapshot.get('open_alerts')} open, {project_snapshot.get('critical_alerts')} critical"
            )
            recent_alerts = project_snapshot.get("recent_alerts") or []
            if recent_alerts:
                lines.append(f"  Recent alerts: {recent_alerts}")
            recent_events = project_snapshot.get("recent_events") or []
            if recent_events:
                lines.append(f"  Recent events: {recent_events}")

        alert = context.get("alert")
        if isinstance(alert, dict):
            lines.append("- Selected alert:")
            lines.append(f"  Title: {alert.get('title')}")
            lines.append(f"  Severity: {alert.get('severity')} | Status: {alert.get('status')} | Score: {alert.get('score')}")
            lines.append(f"  Source: {alert.get('source_name')} ({alert.get('source_type')})")
            lines.append(f"  Description: {alert.get('description')}")

        event = context.get("event")
        if isinstance(event, dict):
            lines.append("- Selected event:")
            lines.append(f"  Kind: {event.get('kind')}")
            lines.append(f"  Source: {event.get('source_name')} ({event.get('source_type')})")
            lines.append(f"  Type: {event.get('event_type')}")
            if event.get("service"):
                lines.append(f"  Service: {event.get('service')} | Level: {event.get('level')}")
            if event.get("model_name"):
                lines.append(f"  Model: {event.get('model_name')} {event.get('model_version') or ''}".rstrip())
            if event.get("confidence_score") is not None:
                lines.append(f"  Confidence: {event.get('confidence_score')}")
            if event.get("chain_hash"):
                lines.append(f"  Chain hash: {event.get('chain_hash')}")
            if event.get("prompt"):
                lines.append(f"  Prompt: {event.get('prompt')}")
            if event.get("response"):
                lines.append(f"  Response: {event.get('response')}")
            metadata = event.get("metadata")
            if metadata:
                lines.append(f"  Metadata: {metadata}")

        lines.append(
            "Use this context when answering. Refer to it directly, stay grounded in the provided evidence, and say when evidence is missing."
        )
        return "\n".join(lines)


chat_service = ChatService()
