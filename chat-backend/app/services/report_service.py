from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.models import Project, User
from app.schemas.report_schema import (
    ProjectAuditReportResponse,
    ReportRecentAlert,
    ReportRecentEvent,
    ReportSourceSummary,
)
from app.services.alert_service import alert_service
from app.services.monitoring_service import monitoring_service


class ReportService:
    async def get_project_audit_report(
        self,
        db_session: AsyncSession,
        *,
        user: User,
        project_id: str,
    ) -> ProjectAuditReportResponse:
        project: Project | None = await crud.get_project_for_user(
            db_session,
            project_id=project_id,
            user_id=str(user.id),
        )
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or inaccessible",
            )

        overview = await monitoring_service.get_project_overview(
            db_session,
            user=user,
            project_id=project_id,
        )
        event_list = await monitoring_service.list_events(
            db_session,
            user=user,
            project_id=project_id,
            limit=10,
        )
        alert_list = await alert_service.list_alerts(
            db_session,
            user=user,
            project_id=project_id,
            limit=10,
        )
        sources = await crud.list_sources_for_project(db_session, project_id)

        recent_events = [
            ReportRecentEvent(
                event_id=str(item.id),
                kind=item.kind,
                source_name=item.source_name,
                timestamp=item.timestamp,
                label=item.event_type or item.service or "Unnamed event",
                actor_id=item.actor_id,
                chain_hash=item.chain_hash,
            )
            for item in event_list.items[:5]
        ]

        recent_alerts = [
            ReportRecentAlert(
                alert_id=str(item.id),
                title=item.title,
                severity=item.severity,
                status=item.status,
                source_name=item.source_name,
                score=item.score,
                created_at=item.created_at,
            )
            for item in alert_list.items[:5]
        ]

        source_summaries = [
            ReportSourceSummary(
                source_id=str(source.id),
                source_name=source.name,
                source_type=source.type,
                status=source.status,
                api_key_prefix=source.api_key_prefix,
                last_key_rotated_at=source.last_key_rotated_at,
            )
            for source in sources
        ]

        summary = (
            f"Project {project.name} recorded {overview.total_events} total events with "
            f"{overview.total_alerts} alerts, including {overview.critical_alerts} critical alerts. "
            f"Integrity coverage is {overview.integrity_score_percent:.1f}% with "
            f"{overview.invalid_events} invalid events detected."
        )

        return ProjectAuditReportResponse(
            project_id=str(project.id),
            project_name=project.name,
            generated_at=datetime.now(timezone.utc),
            summary=summary,
            reporting_window="Latest available project evidence snapshot",
            total_events=overview.total_events,
            ai_events=overview.ai_events,
            system_events=overview.system_events,
            total_alerts=overview.total_alerts,
            open_alerts=overview.open_alerts,
            critical_alerts=overview.critical_alerts,
            verified_events=overview.verified_events,
            invalid_events=overview.invalid_events,
            integrity_score_percent=overview.integrity_score_percent,
            ready_sources=overview.ready_sources,
            connected_sources=overview.connected_sources,
            paused_sources=overview.paused_sources,
            source_count=overview.total_sources,
            source_summaries=source_summaries,
            recent_events=recent_events,
            recent_alerts=recent_alerts,
        )


report_service = ReportService()
