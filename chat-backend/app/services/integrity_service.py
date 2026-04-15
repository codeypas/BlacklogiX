from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.models import AIEvent, IngestionSource, IngestionSourceType, Project, SystemEvent, User
from app.schemas.integrity_schema import (
    IntegrityBackfillResponse,
    IntegrityProjectSourceSummary,
    IntegrityProjectSummaryResponse,
    IntegrityVerifyResponse,
)
from app.utils.integrity import HASH_ALGORITHM, compute_chain_hash, compute_raw_hash


@dataclass(slots=True)
class IntegrityChainAnalysis:
    total_events: int
    verified_events: int
    invalid_events: int
    legacy_events: int
    first_invalid_event_id: str | None
    latest_chain_hash: str | None
    expected_chain_hash: str | None
    actual_chain_hash: str | None


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

    async def _list_source_events(
        self,
        db_session: AsyncSession,
        *,
        source: IngestionSource,
    ) -> list[AIEvent | SystemEvent]:
        if source.type == IngestionSourceType.AI_APPLICATION.value:
            return await crud.list_ai_events_for_source(db_session, str(source.id))
        return await crud.list_system_events_for_source(db_session, str(source.id))

    async def _get_latest_source_event(
        self,
        db_session: AsyncSession,
        *,
        source: IngestionSource,
    ) -> AIEvent | SystemEvent | None:
        if source.type == IngestionSourceType.AI_APPLICATION.value:
            return await crud.get_latest_ai_event_for_source(db_session, str(source.id))
        return await crud.get_latest_system_event_for_source(db_session, str(source.id))

    def _verify_event_chain(
        self,
        events: Iterable[AIEvent | SystemEvent],
    ) -> IntegrityChainAnalysis:
        previous_expected_hash: str | None = None
        verified_events = 0
        invalid_events = 0
        legacy_events = 0
        first_invalid_event_id: str | None = None
        latest_chain_hash: str | None = None
        expected_chain_hash: str | None = None
        actual_chain_hash: str | None = None
        total_events = 0

        for event in events:
            total_events += 1
            raw_hash = compute_raw_hash(event.raw_payload or {})
            calculated_chain_hash = compute_chain_hash(raw_hash, previous_expected_hash)
            has_complete_integrity_fields = bool(event.hash_algorithm and event.raw_hash and event.chain_hash)
            is_legacy_event = not has_complete_integrity_fields
            is_valid = (
                not is_legacy_event
                and event.hash_algorithm == HASH_ALGORITHM
                and event.raw_hash == raw_hash
                and event.previous_hash == previous_expected_hash
                and event.chain_hash == calculated_chain_hash
            )

            if is_valid:
                verified_events += 1
            else:
                invalid_events += 1
                if is_legacy_event:
                    legacy_events += 1
                if first_invalid_event_id is None:
                    first_invalid_event_id = str(event.id)
                    expected_chain_hash = calculated_chain_hash
                    actual_chain_hash = event.chain_hash

            latest_chain_hash = event.chain_hash
            previous_expected_hash = calculated_chain_hash

        return IntegrityChainAnalysis(
            total_events=total_events,
            verified_events=verified_events,
            invalid_events=invalid_events,
            legacy_events=legacy_events,
            first_invalid_event_id=first_invalid_event_id,
            latest_chain_hash=latest_chain_hash,
            expected_chain_hash=expected_chain_hash,
            actual_chain_hash=actual_chain_hash,
        )

    async def verify_source(
        self,
        db_session: AsyncSession,
        *,
        source: IngestionSource,
    ) -> IntegrityVerifyResponse:
        events = await self._list_source_events(db_session, source=source)
        analysis = self._verify_event_chain(events)

        return IntegrityVerifyResponse(
            source_id=source.id,
            source_type=source.type,
            total_events=analysis.total_events,
            verified_events=analysis.verified_events,
            invalid_events=analysis.invalid_events,
            legacy_events=analysis.legacy_events,
            is_valid=analysis.invalid_events == 0,
            needs_backfill=analysis.legacy_events > 0,
            first_invalid_event_id=analysis.first_invalid_event_id,
            latest_chain_hash=analysis.latest_chain_hash,
            expected_chain_hash=analysis.expected_chain_hash,
            actual_chain_hash=analysis.actual_chain_hash,
        )

    async def backfill_source(
        self,
        db_session: AsyncSession,
        *,
        source: IngestionSource,
    ) -> IntegrityBackfillResponse:
        events = await self._list_source_events(db_session, source=source)
        previous_hash: str | None = None
        backfilled_events = 0
        latest_chain_hash: str | None = None

        for event in events:
            raw_hash = compute_raw_hash(event.raw_payload or {})
            chain_hash = compute_chain_hash(raw_hash, previous_hash)
            needs_update = (
                event.hash_algorithm != HASH_ALGORITHM
                or event.raw_hash != raw_hash
                or event.previous_hash != previous_hash
                or event.chain_hash != chain_hash
            )
            if needs_update:
                backfilled_events += 1
                event.hash_algorithm = HASH_ALGORITHM
                event.raw_hash = raw_hash
                event.previous_hash = previous_hash
                event.chain_hash = chain_hash

            previous_hash = chain_hash
            latest_chain_hash = chain_hash

        await db_session.commit()
        verification = await self.verify_source(db_session, source=source)
        return IntegrityBackfillResponse(
            source_id=source.id,
            source_type=source.type,
            total_events=len(events),
            backfilled_events=backfilled_events,
            latest_chain_hash=latest_chain_hash,
            checked_at=datetime.now(timezone.utc),
            verification=verification,
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
        legacy_events = 0

        for source in sources:
            verification = await self.verify_source(db_session, source=source)
            latest = await self._get_latest_source_event(db_session, source=source)
            latest_chain_hash = latest.chain_hash if latest is not None else None

            total_events += verification.total_events
            verified_events += verification.verified_events
            invalid_events += verification.invalid_events
            legacy_events += verification.legacy_events
            source_summaries.append(
                IntegrityProjectSourceSummary(
                    source_id=source.id,
                    source_name=source.name,
                    source_type=source.type,
                    total_events=verification.total_events,
                    verified_events=verification.verified_events,
                    invalid_events=verification.invalid_events,
                    legacy_events=verification.legacy_events,
                    needs_backfill=verification.needs_backfill,
                    latest_chain_hash=latest_chain_hash,
                )
            )

        return IntegrityProjectSummaryResponse(
            project_id=project.id,
            total_sources=len(sources),
            total_events=total_events,
            verified_events=verified_events,
            invalid_events=invalid_events,
            legacy_events=legacy_events,
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
