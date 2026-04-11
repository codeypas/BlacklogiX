from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    source_id: UUID
    ai_event_id: UUID | None
    system_event_id: UUID | None
    alert_type: str
    title: str
    description: str
    severity: str
    status: str
    score: float
    metadata_json: dict[str, Any]
    created_at: datetime


class AlertListItem(BaseModel):
    id: UUID
    project_id: UUID
    source_id: UUID
    source_name: str
    source_type: str
    event_kind: str
    event_id: UUID | None
    alert_type: str
    title: str
    description: str
    severity: str
    status: str
    score: float
    created_at: datetime


class AlertListResponse(BaseModel):
    items: list[AlertListItem]
    total_returned: int


class AlertDetailResponse(AlertListItem):
    metadata: dict[str, Any]

