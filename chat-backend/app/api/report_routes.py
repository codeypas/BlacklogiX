from __future__ import annotations

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
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


@router.get(
    "/reports/project/{project_id}/pdf",
    status_code=status.HTTP_200_OK,
)
async def download_project_audit_report_pdf(
    project_id: str,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    report = await report_service.get_project_audit_report(
        db_session,
        user=current_user,
        project_id=project_id,
    )
    pdf_bytes = report_service.build_project_audit_report_pdf(report)
    filename = f"{report.project_name.lower().replace(' ', '-')}-audit-report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
