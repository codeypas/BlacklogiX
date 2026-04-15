from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class IntegrityVerifyRequest(BaseModel):
    source_id: UUID


class IntegrityBackfillRequest(BaseModel):
    source_id: UUID


class IntegrityVerifyResponse(BaseModel):
    source_id: UUID
    source_type: str
    total_events: int
    verified_events: int
    invalid_events: int
    legacy_events: int
    is_valid: bool
    needs_backfill: bool
    first_invalid_event_id: UUID | None
    latest_chain_hash: str | None
    expected_chain_hash: str | None
    actual_chain_hash: str | None


class IntegrityProjectSourceSummary(BaseModel):
    source_id: UUID
    source_name: str
    source_type: str
    total_events: int
    verified_events: int
    invalid_events: int
    legacy_events: int
    needs_backfill: bool
    latest_chain_hash: str | None


class IntegrityProjectSummaryResponse(BaseModel):
    project_id: UUID
    total_sources: int
    total_events: int
    verified_events: int
    invalid_events: int
    legacy_events: int
    checked_at: datetime
    sources: list[IntegrityProjectSourceSummary]


class IntegrityBackfillResponse(BaseModel):
    source_id: UUID
    source_type: str
    total_events: int
    backfilled_events: int
    latest_chain_hash: str | None
    checked_at: datetime
    verification: IntegrityVerifyResponse
