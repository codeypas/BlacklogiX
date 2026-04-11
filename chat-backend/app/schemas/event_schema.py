from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AIEventIngestRequest(BaseModel):
    project_id: UUID
    source_id: UUID
    timestamp: datetime
    event_type: str = Field(min_length=2, max_length=120)
    model_name: str | None = Field(default=None, max_length=255)
    model_version: str | None = Field(default=None, max_length=255)
    prompt: str | None = None
    response: str | None = None
    confidence_score: float | None = Field(default=None, ge=0.0, le=1.0)
    metadata: dict[str, Any] = Field(default_factory=dict)
    raw_payload: dict[str, Any] | None = None


class SystemEventIngestRequest(BaseModel):
    project_id: UUID
    source_id: UUID
    timestamp: datetime
    service: str = Field(min_length=2, max_length=255)
    level: str = Field(min_length=2, max_length=64)
    event: str = Field(min_length=2, max_length=255)
    metadata: dict[str, Any] = Field(default_factory=dict)
    raw_payload: dict[str, Any] | None = None


class EventAcceptedResponse(BaseModel):
    id: UUID
    kind: str
    project_id: UUID
    source_id: UUID
    timestamp: datetime


class BulkEventIngestRequest(BaseModel):
    ai_events: list[AIEventIngestRequest] = Field(default_factory=list)
    system_events: list[SystemEventIngestRequest] = Field(default_factory=list)


class BulkEventIngestResponse(BaseModel):
    ai_event_ids: list[UUID]
    system_event_ids: list[UUID]
    total_ingested: int


class EventListItem(BaseModel):
    id: UUID
    kind: str
    project_id: UUID
    source_id: UUID
    source_name: str
    source_type: str
    timestamp: datetime
    event_type: str | None
    service: str | None
    level: str | None
    model_name: str | None
    model_version: str | None
    confidence_score: float | None
    actor_id: str | None
    hash_algorithm: str | None
    raw_hash: str | None
    previous_hash: str | None
    chain_hash: str | None


class EventDetailResponse(EventListItem):
    prompt: str | None
    response: str | None
    metadata: dict[str, Any] = Field(default_factory=dict)
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class EventListResponse(BaseModel):
    items: list[EventListItem]
    total_returned: int


class ProjectOverviewResponse(BaseModel):
    project_id: UUID
    project_name: str
    total_events: int
    ai_events: int
    system_events: int
    total_alerts: int
    open_alerts: int
    critical_alerts: int
    total_sources: int
    ready_sources: int
    connected_sources: int
    paused_sources: int
    verified_events: int
    invalid_events: int
    integrity_score_percent: float
    latest_event_at: datetime | None
    checked_at: datetime
