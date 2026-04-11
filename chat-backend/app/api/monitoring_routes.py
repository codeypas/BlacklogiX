from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db_session
from app.db.models import User
from app.schemas.event_schema import EventDetailResponse, EventListResponse, ProjectOverviewResponse
from app.services.monitoring_service import monitoring_service
from app.utils.auth import get_current_user

router = APIRouter(tags=["monitoring"])


@router.get("/events", response_model=EventListResponse, status_code=status.HTTP_200_OK)
async def list_events(
    project_id: str | None = None,
    source_id: str | None = None,
    kind: str | None = Query(default=None, pattern="^(ai|system)$"),
    service: str | None = None,
    level: str | None = None,
    event_type: str | None = None,
    actor_id: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> EventListResponse:
    return await monitoring_service.list_events(
        db_session,
        user=current_user,
        project_id=project_id,
        source_id=source_id,
        kind=kind,
        service=service,
        level=level,
        event_type=event_type,
        actor_id=actor_id,
        start_at=start_at,
        end_at=end_at,
        limit=limit,
    )


@router.get("/events/{event_id}", response_model=EventDetailResponse, status_code=status.HTTP_200_OK)
async def get_event_detail(
    event_id: str,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> EventDetailResponse:
    return await monitoring_service.get_event_detail(
        db_session,
        user=current_user,
        event_id=event_id,
    )


@router.get("/overview/{project_id}", response_model=ProjectOverviewResponse, status_code=status.HTTP_200_OK)
async def get_project_overview(
    project_id: str,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProjectOverviewResponse:
    return await monitoring_service.get_project_overview(
        db_session,
        user=current_user,
        project_id=project_id,
    )
