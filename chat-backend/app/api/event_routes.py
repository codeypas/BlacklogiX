from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.database import get_db_session
from app.db.models import IngestionSourceStatus, IngestionSourceType, User
from app.schemas.event_schema import (
    AIEventIngestRequest,
    BulkEventIngestRequest,
    BulkEventIngestResponse,
    EventAcceptedResponse,
    SystemEventIngestRequest,
)
from app.services.alert_service import alert_service
from app.utils.auth import get_optional_current_user, get_source_from_api_key
from app.services.integrity_service import integrity_service

router = APIRouter(prefix="/events", tags=["events"])


async def _validate_source_access_and_type(
    db_session: AsyncSession,
    *,
    source_id: str,
    project_id: str,
    user_id: str | None,
    expected_type: IngestionSourceType,
    source_api_key: str | None = None,
):
    source = None

    if source_api_key:
        source = await get_source_from_api_key(api_key=source_api_key, db_session=db_session)
        if source is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid source API key",
            )

        if str(source.id) != source_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Source API key does not match the provided source",
            )
    elif user_id:
        source = await crud.get_source_for_user(db_session, source_id, user_id)
        if source is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source not found or inaccessible",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    if str(source.project_id) != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source does not belong to the provided project",
        )

    if source.type != expected_type.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source type must be {expected_type.value}",
        )

    if source.status == IngestionSourceStatus.PAUSED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Source is paused and cannot ingest events",
        )

    return source


@router.post("/ai", response_model=EventAcceptedResponse, status_code=status.HTTP_201_CREATED)
async def ingest_ai_event(
    payload: AIEventIngestRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    source_api_key: str | None = Header(default=None, alias="X-BlackLogix-Source-Key"),
) -> EventAcceptedResponse:
    await _validate_source_access_and_type(
        db_session,
        source_id=str(payload.source_id),
        project_id=str(payload.project_id),
        user_id=str(current_user.id) if current_user else None,
        expected_type=IngestionSourceType.AI_APPLICATION,
        source_api_key=source_api_key,
    )

    raw_payload = payload.raw_payload or payload.model_dump(mode="json")
    hash_algorithm, raw_hash, previous_hash, chain_hash = await integrity_service.prepare_ai_event_hashes(
        db_session,
        source_id=str(payload.source_id),
        raw_payload=raw_payload,
    )
    event = await crud.create_ai_event(
        db_session,
        project_id=str(payload.project_id),
        source_id=str(payload.source_id),
        timestamp=payload.timestamp,
        event_type=payload.event_type,
        model_name=payload.model_name,
        model_version=payload.model_version,
        prompt=payload.prompt,
        response=payload.response,
        confidence_score=payload.confidence_score,
        hash_algorithm=hash_algorithm,
        raw_hash=raw_hash,
        previous_hash=previous_hash,
        chain_hash=chain_hash,
        metadata_json=payload.metadata,
        raw_payload=raw_payload,
    )
    await alert_service.create_alerts_for_ai_event(db_session, event=event)
    return EventAcceptedResponse(
        id=event.id,
        kind="ai",
        project_id=event.project_id,
        source_id=event.source_id,
        timestamp=event.timestamp,
    )


@router.post("/system", response_model=EventAcceptedResponse, status_code=status.HTTP_201_CREATED)
async def ingest_system_event(
    payload: SystemEventIngestRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    source_api_key: str | None = Header(default=None, alias="X-BlackLogix-Source-Key"),
) -> EventAcceptedResponse:
    await _validate_source_access_and_type(
        db_session,
        source_id=str(payload.source_id),
        project_id=str(payload.project_id),
        user_id=str(current_user.id) if current_user else None,
        expected_type=IngestionSourceType.SYSTEM_LOGS,
        source_api_key=source_api_key,
    )

    raw_payload = payload.raw_payload or payload.model_dump(mode="json")
    hash_algorithm, raw_hash, previous_hash, chain_hash = await integrity_service.prepare_system_event_hashes(
        db_session,
        source_id=str(payload.source_id),
        raw_payload=raw_payload,
    )
    event = await crud.create_system_event(
        db_session,
        project_id=str(payload.project_id),
        source_id=str(payload.source_id),
        timestamp=payload.timestamp,
        service=payload.service,
        level=payload.level,
        event_name=payload.event,
        hash_algorithm=hash_algorithm,
        raw_hash=raw_hash,
        previous_hash=previous_hash,
        chain_hash=chain_hash,
        metadata_json=payload.metadata,
        raw_payload=raw_payload,
    )
    await alert_service.create_alerts_for_system_event(db_session, event=event)
    return EventAcceptedResponse(
        id=event.id,
        kind="system",
        project_id=event.project_id,
        source_id=event.source_id,
        timestamp=event.timestamp,
    )


@router.post("/bulk", response_model=BulkEventIngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_bulk_events(
    payload: BulkEventIngestRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    source_api_key: str | None = Header(default=None, alias="X-BlackLogix-Source-Key"),
) -> BulkEventIngestResponse:
    ai_event_ids = []
    system_event_ids = []

    for item in payload.ai_events:
        await _validate_source_access_and_type(
            db_session,
            source_id=str(item.source_id),
            project_id=str(item.project_id),
            user_id=str(current_user.id) if current_user else None,
            expected_type=IngestionSourceType.AI_APPLICATION,
            source_api_key=source_api_key,
        )
        raw_payload = item.raw_payload or item.model_dump(mode="json")
        hash_algorithm, raw_hash, previous_hash, chain_hash = await integrity_service.prepare_ai_event_hashes(
            db_session,
            source_id=str(item.source_id),
            raw_payload=raw_payload,
        )
        event = await crud.create_ai_event(
            db_session,
            project_id=str(item.project_id),
            source_id=str(item.source_id),
            timestamp=item.timestamp,
            event_type=item.event_type,
            model_name=item.model_name,
            model_version=item.model_version,
            prompt=item.prompt,
            response=item.response,
            confidence_score=item.confidence_score,
            hash_algorithm=hash_algorithm,
            raw_hash=raw_hash,
            previous_hash=previous_hash,
            chain_hash=chain_hash,
            metadata_json=item.metadata,
            raw_payload=raw_payload,
        )
        await alert_service.create_alerts_for_ai_event(db_session, event=event)
        ai_event_ids.append(event.id)

    for item in payload.system_events:
        await _validate_source_access_and_type(
            db_session,
            source_id=str(item.source_id),
            project_id=str(item.project_id),
            user_id=str(current_user.id) if current_user else None,
            expected_type=IngestionSourceType.SYSTEM_LOGS,
            source_api_key=source_api_key,
        )
        raw_payload = item.raw_payload or item.model_dump(mode="json")
        hash_algorithm, raw_hash, previous_hash, chain_hash = await integrity_service.prepare_system_event_hashes(
            db_session,
            source_id=str(item.source_id),
            raw_payload=raw_payload,
        )
        event = await crud.create_system_event(
            db_session,
            project_id=str(item.project_id),
            source_id=str(item.source_id),
            timestamp=item.timestamp,
            service=item.service,
            level=item.level,
            event_name=item.event,
            hash_algorithm=hash_algorithm,
            raw_hash=raw_hash,
            previous_hash=previous_hash,
            chain_hash=chain_hash,
            metadata_json=item.metadata,
            raw_payload=raw_payload,
        )
        await alert_service.create_alerts_for_system_event(db_session, event=event)
        system_event_ids.append(event.id)

    return BulkEventIngestResponse(
        ai_event_ids=ai_event_ids,
        system_event_ids=system_event_ids,
        total_ingested=len(ai_event_ids) + len(system_event_ids),
    )
