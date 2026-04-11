from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.models import AIEvent, AlertSeverity, AlertStatus, IngestionSourceStatus, Project, SystemEvent, User
from app.schemas.event_schema import EventDetailResponse, EventListItem, EventListResponse, ProjectOverviewResponse
from app.services.integrity_service import integrity_service


class MonitoringService:
    def _extract_actor_id(self, metadata: dict) -> str | None:
        return metadata.get("actor_id") or metadata.get("user_id")

    def _to_event_list_item(self, event: AIEvent | SystemEvent, *, kind: str) -> EventListItem:
        source = getattr(event, "source", None)
        metadata = event.metadata_json or {}

        if kind == "ai":
            return EventListItem(
                id=event.id,
                kind=kind,
                project_id=event.project_id,
                source_id=event.source_id,
                source_name=source.name if source else "Unknown source",
                source_type=source.type if source else "ai_application",
                timestamp=event.timestamp,
                event_type=event.event_type,
                service=None,
                level=None,
                model_name=event.model_name,
                model_version=event.model_version,
                confidence_score=event.confidence_score,
                actor_id=self._extract_actor_id(metadata),
                hash_algorithm=event.hash_algorithm,
                raw_hash=event.raw_hash,
                previous_hash=event.previous_hash,
                chain_hash=event.chain_hash,
            )

        return EventListItem(
            id=event.id,
            kind=kind,
            project_id=event.project_id,
            source_id=event.source_id,
            source_name=source.name if source else "Unknown source",
            source_type=source.type if source else "system_logs",
            timestamp=event.timestamp,
            event_type=event.event_name,
            service=event.service,
            level=event.level,
            model_name=None,
            model_version=None,
            confidence_score=None,
            actor_id=self._extract_actor_id(metadata),
            hash_algorithm=event.hash_algorithm,
            raw_hash=event.raw_hash,
            previous_hash=event.previous_hash,
            chain_hash=event.chain_hash,
        )

    def _to_event_detail(self, event: AIEvent | SystemEvent, *, kind: str) -> EventDetailResponse:
        summary = self._to_event_list_item(event, kind=kind)
        metadata = event.metadata_json or {}
        raw_payload = event.raw_payload or {}

        return EventDetailResponse(
            **summary.model_dump(),
            prompt=getattr(event, "prompt", None),
            response=getattr(event, "response", None),
            metadata=metadata,
            raw_payload=raw_payload,
        )

    async def list_events(
        self,
        db_session: AsyncSession,
        *,
        user: User,
        project_id: str | None = None,
        source_id: str | None = None,
        kind: str | None = None,
        service: str | None = None,
        level: str | None = None,
        event_type: str | None = None,
        actor_id: str | None = None,
        start_at: datetime | None = None,
        end_at: datetime | None = None,
        limit: int = 50,
    ) -> EventListResponse:
        include_ai = kind in (None, "ai")
        include_system = kind in (None, "system")
        per_kind_limit = max(limit, 1)

        items: list[EventListItem] = []

        if include_ai:
            ai_events = await crud.list_ai_events_for_user(
                db_session,
                user_id=str(user.id),
                project_id=project_id,
                source_id=source_id,
                event_type=event_type,
                actor_id=actor_id,
                start_at=start_at,
                end_at=end_at,
                limit=per_kind_limit,
            )
            items.extend(self._to_event_list_item(event, kind="ai") for event in ai_events)

        if include_system:
            system_events = await crud.list_system_events_for_user(
                db_session,
                user_id=str(user.id),
                project_id=project_id,
                source_id=source_id,
                service=service,
                level=level,
                event_name=event_type,
                actor_id=actor_id,
                start_at=start_at,
                end_at=end_at,
                limit=per_kind_limit,
            )
            items.extend(self._to_event_list_item(event, kind="system") for event in system_events)

        items.sort(key=lambda item: item.timestamp, reverse=True)
        trimmed_items = items[:limit]
        return EventListResponse(items=trimmed_items, total_returned=len(trimmed_items))

    async def get_event_detail(
        self,
        db_session: AsyncSession,
        *,
        user: User,
        event_id: str,
    ) -> EventDetailResponse:
        ai_event = await crud.get_ai_event_for_user(
            db_session,
            event_id=event_id,
            user_id=str(user.id),
        )
        if ai_event is not None:
            return self._to_event_detail(ai_event, kind="ai")

        system_event = await crud.get_system_event_for_user(
            db_session,
            event_id=event_id,
            user_id=str(user.id),
        )
        if system_event is not None:
            return self._to_event_detail(system_event, kind="system")

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found or inaccessible",
        )

    async def get_project_overview(
        self,
        db_session: AsyncSession,
        *,
        user: User,
        project_id: str,
    ) -> ProjectOverviewResponse:
        project: Project | None = await crud.get_project_for_user(
            db_session,
            project_id,
            str(user.id),
        )
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or inaccessible",
            )

        sources = await crud.list_sources_for_project(db_session, project_id)
        ai_events = await crud.count_ai_events_for_project(db_session, project_id=project_id)
        system_events = await crud.count_system_events_for_project(db_session, project_id=project_id)
        total_alerts = await crud.count_alerts_for_project(db_session, project_id=project_id)
        open_alerts = await crud.count_alerts_for_project(
            db_session,
            project_id=project_id,
            status=AlertStatus.OPEN.value,
        )
        critical_alerts = await crud.count_alerts_for_project(
            db_session,
            project_id=project_id,
            severity=AlertSeverity.CRITICAL.value,
        )
        integrity_summary = await integrity_service.summarize_project(db_session, project=project)

        latest_ai_event = await crud.get_latest_ai_event_for_project(db_session, project_id=project_id)
        latest_system_event = await crud.get_latest_system_event_for_project(db_session, project_id=project_id)
        latest_event_at = None
        latest_candidates = [item.timestamp for item in (latest_ai_event, latest_system_event) if item is not None]
        if latest_candidates:
            latest_event_at = max(latest_candidates)

        ready_sources = sum(1 for source in sources if source.status == IngestionSourceStatus.READY.value)
        connected_sources = sum(1 for source in sources if source.status == IngestionSourceStatus.CONNECTED.value)
        paused_sources = sum(1 for source in sources if source.status == IngestionSourceStatus.PAUSED.value)
        total_events = ai_events + system_events
        integrity_score_percent = 100.0 if total_events == 0 else round(
            (integrity_summary.verified_events / total_events) * 100,
            2,
        )

        return ProjectOverviewResponse(
            project_id=project.id,
            project_name=project.name,
            total_events=total_events,
            ai_events=ai_events,
            system_events=system_events,
            total_alerts=total_alerts,
            open_alerts=open_alerts,
            critical_alerts=critical_alerts,
            total_sources=len(sources),
            ready_sources=ready_sources,
            connected_sources=connected_sources,
            paused_sources=paused_sources,
            verified_events=integrity_summary.verified_events,
            invalid_events=integrity_summary.invalid_events,
            integrity_score_percent=integrity_score_percent,
            latest_event_at=latest_event_at,
            checked_at=integrity_summary.checked_at,
        )


monitoring_service = MonitoringService()
