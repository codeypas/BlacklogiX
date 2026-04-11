from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.models import AIEvent, IngestionSource, IngestionSourceType, Project, SystemEvent, User
from app.schemas.integrity_schema import (
    IntegrityProjectSourceSummary,
    IntegrityProjectSummaryResponse,
    IntegrityVerifyResponse,
)
from app.utils.integrity import HASH_ALGORITHM, compute_chain_hash, compute_raw_hash


class IntegrityService:
    async def prepare_ai_event_hashes(
        self,
        db_session: AsyncSession,
        *,
        source_id: str,
        raw_payload: dict,
    ) -> tuple[str, str | None, str, str]:
        previous_event = await crud.get_latest_ai_event_for_source(db_session, source_id)
        previous_hash = previous_event.chain_hash if previous_event else None
        raw_hash = compute_raw_hash(raw_payload)
        chain_hash = compute_chain_hash(raw_hash, previous_hash)
        return HASH_ALGORITHM, raw_hash, previous_hash, chain_hash

    async def prepare_system_event_hashes(
        self,
        db_session: AsyncSession,
        *,
        source_id: str,
        raw_payload: dict,
    ) -> tuple[str, str | None, str, str]:
        previous_event = await crud.get_latest_system_event_for_source(db_session, source_id)
        previous_hash = previous_event.chain_hash if previous_event else None
        raw_hash = compute_raw_hash(raw_payload)
        chain_hash = compute_chain_hash(raw_hash, previous_hash)
        return HASH_ALGORITHM, raw_hash, previous_hash, chain_hash

    def _verify_event_chain(
        self,
        events: Iterable[AIEvent | SystemEvent],
    ) -> tuple[int, int, int, str | None, str | None, str | None]:
        previous_hash: str | None = None
        verified_events = 0
        invalid_events = 0
        first_invalid_event_id: str | None = None
        expected_chain_hash: str | None = None
        actual_chain_hash: str | None = None

        for event in events:
            raw_hash = compute_raw_hash(event.raw_payload)
            calculated_chain_hash = compute_chain_hash(raw_hash, previous_hash)
            is_valid = (
                event.hash_algorithm == HASH_ALGORITHM
                and event.raw_hash == raw_hash
                and event.previous_hash == previous_hash
                and event.chain_hash == calculated_chain_hash
            )

            if is_valid:
                verified_events += 1
            else:
                invalid_events += 1
                if first_invalid_event_id is None:
                    first_invalid_event_id = str(event.id)
                    expected_chain_hash = calculated_chain_hash
                    actual_chain_hash = event.chain_hash

            previous_hash = event.chain_hash

        return (
            verified_events + invalid_events,
            verified_events,
            invalid_events,
            first_invalid_event_id,
            expected_chain_hash,
            actual_chain_hash,
        )

    async def verify_source(
        self,
        db_session: AsyncSession,
        *,
        source: IngestionSource,
    ) -> IntegrityVerifyResponse:
        if source.type == IngestionSourceType.AI_APPLICATION.value:
            events = await crud.list_ai_events_for_source(db_session, str(source.id))
        else:
            events = await crud.list_system_events_for_source(db_session, str(source.id))

        (
            total_events,
            verified_events,
            invalid_events,
            first_invalid_event_id,
            expected_chain_hash,
            actual_chain_hash,
        ) = self._verify_event_chain(events)

        return IntegrityVerifyResponse(
            source_id=source.id,
            source_type=source.type,
            total_events=total_events,
            verified_events=verified_events,
            invalid_events=invalid_events,
            is_valid=invalid_events == 0,
            first_invalid_event_id=first_invalid_event_id,
            expected_chain_hash=expected_chain_hash,
            actual_chain_hash=actual_chain_hash,
        )

    async def summarize_project(
        self,
        db_session: AsyncSession,
        *,
        project: Project,
    ) -> IntegrityProjectSummaryResponse:
        sources = await crud.list_sources_for_project(db_session, str(project.id))
        source_summaries: list[IntegrityProjectSourceSummary] = []
        total_events = 0
        verified_events = 0
        invalid_events = 0

        for source in sources:
            verification = await self.verify_source(db_session, source=source)
            latest_chain_hash = None

            if source.type == IngestionSourceType.AI_APPLICATION.value:
                latest = await crud.get_latest_ai_event_for_source(db_session, str(source.id))
            else:
                latest = await crud.get_latest_system_event_for_source(db_session, str(source.id))

            if latest is not None:
                latest_chain_hash = latest.chain_hash

            total_events += verification.total_events
            verified_events += verification.verified_events
            invalid_events += verification.invalid_events
            source_summaries.append(
                IntegrityProjectSourceSummary(
                    source_id=source.id,
                    source_name=source.name,
                    source_type=source.type,
                    total_events=verification.total_events,
                    verified_events=verification.verified_events,
                    invalid_events=verification.invalid_events,
                    latest_chain_hash=latest_chain_hash,
                )
            )

        return IntegrityProjectSummaryResponse(
            project_id=project.id,
            total_sources=len(sources),
            total_events=total_events,
            verified_events=verified_events,
            invalid_events=invalid_events,
            checked_at=datetime.now(timezone.utc),
            sources=source_summaries,
        )

    async def get_accessible_source(
        self,
        db_session: AsyncSession,
        *,
        source_id: str,
        user: User,
    ) -> IngestionSource:
        source = await crud.get_source_for_user(db_session, source_id, str(user.id))
        if source is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source not found or inaccessible",
            )
        return source

    async def get_accessible_project(
        self,
        db_session: AsyncSession,
        *,
        project_id: str,
        user: User,
    ) -> Project:
        project = await crud.get_project_for_user(db_session, project_id, str(user.id))
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or inaccessible",
            )
        return project


integrity_service = IntegrityService()
