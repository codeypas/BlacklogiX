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
