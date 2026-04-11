from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db_session
from app.db.models import User
from app.schemas.report_schema import ProjectAuditReportResponse
from app.services.report_service import report_service
from app.utils.auth import get_current_user

router = APIRouter(tags=["reports"])


@router.get(
    "/reports/project/{project_id}",
    response_model=ProjectAuditReportResponse,
    status_code=status.HTTP_200_OK,
)
async def get_project_audit_report(
    project_id: str,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProjectAuditReportResponse:
    return await report_service.get_project_audit_report(
        db_session,
        user=current_user,
        project_id=project_id,
    )
