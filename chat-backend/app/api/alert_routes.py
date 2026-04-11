from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db_session
from app.db.models import User
from app.schemas.alert_schema import AlertDetailResponse, AlertListResponse
from app.services.alert_service import alert_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=AlertListResponse, status_code=status.HTTP_200_OK)
async def list_alerts(
    project_id: str | None = None,
    source_id: str | None = None,
    severity: str | None = Query(default=None, pattern="^(low|medium|high|critical)$"),
    status_value: str | None = Query(default=None, alias="status", pattern="^(open|acknowledged|resolved)$"),
    limit: int = Query(default=50, ge=1, le=200),
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AlertListResponse:
    return await alert_service.list_alerts(
        db_session,
        user=current_user,
        project_id=project_id,
        source_id=source_id,
        severity=severity,
        status_value=status_value,
        limit=limit,
    )


@router.get("/{alert_id}", response_model=AlertDetailResponse, status_code=status.HTTP_200_OK)
async def get_alert_detail(
    alert_id: str,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AlertDetailResponse:
    return await alert_service.get_alert_detail(
        db_session,
        user=current_user,
        alert_id=alert_id,
    )


@router.post("/{alert_id}/acknowledge", response_model=AlertDetailResponse, status_code=status.HTTP_200_OK)
async def acknowledge_alert(
    alert_id: str,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AlertDetailResponse:
    return await alert_service.acknowledge_alert(
        db_session,
        user=current_user,
        alert_id=alert_id,
    )


@router.post("/{alert_id}/resolve", response_model=AlertDetailResponse, status_code=status.HTTP_200_OK)
async def resolve_alert(
    alert_id: str,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AlertDetailResponse:
    return await alert_service.resolve_alert(
        db_session,
        user=current_user,
        alert_id=alert_id,
    )
