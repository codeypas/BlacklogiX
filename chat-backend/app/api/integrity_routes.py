from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db_session
from app.db.models import User
from app.schemas.integrity_schema import (
    IntegrityBackfillRequest,
    IntegrityBackfillResponse,
    IntegrityProjectSummaryResponse,
    IntegrityVerifyRequest,
    IntegrityVerifyResponse,
)
from app.services.integrity_service import integrity_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/integrity", tags=["integrity"])


@router.post("/verify", response_model=IntegrityVerifyResponse, status_code=status.HTTP_200_OK)
async def verify_source_integrity(
    payload: IntegrityVerifyRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> IntegrityVerifyResponse:
    source = await integrity_service.get_accessible_source(
        db_session,
        source_id=str(payload.source_id),
        user=current_user,
    )
    return await integrity_service.verify_source(db_session, source=source)


@router.post("/backfill", response_model=IntegrityBackfillResponse, status_code=status.HTTP_200_OK)
async def backfill_source_integrity(
    payload: IntegrityBackfillRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> IntegrityBackfillResponse:
    source = await integrity_service.get_accessible_source(
        db_session,
        source_id=str(payload.source_id),
        user=current_user,
    )
    return await integrity_service.backfill_source(db_session, source=source)


@router.get(
    "/project/{project_id}/summary",
    response_model=IntegrityProjectSummaryResponse,
    status_code=status.HTTP_200_OK,
)
async def get_project_integrity_summary(
    project_id: str,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> IntegrityProjectSummaryResponse:
    project = await integrity_service.get_accessible_project(
        db_session,
        project_id=project_id,
        user=current_user,
    )
    return await integrity_service.summarize_project(db_session, project=project)
