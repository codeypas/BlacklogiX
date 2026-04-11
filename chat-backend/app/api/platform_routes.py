from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.database import get_db_session
from app.db.models import IngestionSourceStatus, IngestionSourceType, User
from app.schemas.platform_schema import (
    IngestionSourceCreateRequest,
    IngestionSourceRead,
    OrganizationCreateRequest,
    OrganizationRead,
    ProjectCreateRequest,
    ProjectRead,
)
from app.utils.auth import (
    generate_source_api_key,
    get_current_user,
    get_source_api_key_prefix,
    hash_source_api_key,
)

router = APIRouter(tags=["platform"])


def _serialize_source(source, *, plain_api_key: str | None = None) -> IngestionSourceRead:
    return IngestionSourceRead(
        id=source.id,
        project_id=source.project_id,
        type=source.type,
        name=source.name,
        status=source.status,
        api_key_prefix=source.api_key_prefix,
        last_key_rotated_at=source.last_key_rotated_at,
        plain_api_key=plain_api_key,
        created_at=source.created_at,
    )


@router.post("/organizations", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
async def create_organization(
    payload: OrganizationCreateRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> OrganizationRead:
    organization = await crud.create_organization_with_owner(
        db_session,
        name=payload.name.strip(),
        owner_user_id=str(current_user.id),
    )
    return OrganizationRead.model_validate(organization)


@router.get("/organizations", response_model=list[OrganizationRead], status_code=status.HTTP_200_OK)
async def list_organizations(
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[OrganizationRead]:
    organizations = await crud.list_organizations_for_user(db_session, str(current_user.id))
    return [OrganizationRead.model_validate(item) for item in organizations]


@router.post("/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreateRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    organization = await crud.get_organization_for_user(
        db_session,
        str(payload.organization_id),
        str(current_user.id),
    )
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found or inaccessible",
        )

    project = await crud.create_project(
        db_session,
        organization_id=str(payload.organization_id),
        name=payload.name.strip(),
    )
    return ProjectRead.model_validate(project)


@router.get("/projects", response_model=list[ProjectRead], status_code=status.HTTP_200_OK)
async def list_projects(
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[ProjectRead]:
    projects = await crud.list_projects_for_user(db_session, str(current_user.id))
    return [ProjectRead.model_validate(item) for item in projects]


@router.post("/sources", response_model=IngestionSourceRead, status_code=status.HTTP_201_CREATED)
async def create_ingestion_source(
    payload: IngestionSourceCreateRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> IngestionSourceRead:
    project = await crud.get_project_for_user(
        db_session,
        str(payload.project_id),
        str(current_user.id),
    )
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or inaccessible",
        )

    plain_api_key = generate_source_api_key()
    source = await crud.create_ingestion_source(
        db_session,
        project_id=str(payload.project_id),
        source_type=IngestionSourceType(payload.type),
        name=payload.name.strip(),
        status=IngestionSourceStatus(payload.status),
        api_key_prefix=get_source_api_key_prefix(plain_api_key),
        api_key_hash=hash_source_api_key(plain_api_key),
    )
    return _serialize_source(source, plain_api_key=plain_api_key)


@router.get("/sources", response_model=list[IngestionSourceRead], status_code=status.HTTP_200_OK)
async def list_ingestion_sources(
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[IngestionSourceRead]:
    sources = await crud.list_sources_for_user(db_session, str(current_user.id))
    return [_serialize_source(item) for item in sources]


@router.post(
    "/sources/{source_id}/rotate-key",
    response_model=IngestionSourceRead,
    status_code=status.HTTP_200_OK,
)
async def rotate_ingestion_source_key(
    source_id: str = Path(...),
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> IngestionSourceRead:
    source = await crud.get_source_for_user(
        db_session,
        source_id=source_id,
        user_id=str(current_user.id),
    )
    if source is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found or inaccessible",
        )

    plain_api_key = generate_source_api_key()
    source = await crud.rotate_ingestion_source_api_key(
        db_session,
        source=source,
        api_key_prefix=get_source_api_key_prefix(plain_api_key),
        api_key_hash=hash_source_api_key(plain_api_key),
    )
    return _serialize_source(source, plain_api_key=plain_api_key)
