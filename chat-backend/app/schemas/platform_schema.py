from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OrganizationCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)


class OrganizationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    created_at: datetime


class ProjectCreateRequest(BaseModel):
    organization_id: UUID
    name: str = Field(min_length=2, max_length=255)


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    name: str
    slug: str
    created_at: datetime


class IngestionSourceCreateRequest(BaseModel):
    project_id: UUID
    type: str = Field(pattern="^(ai_application|system_logs)$")
    name: str = Field(min_length=2, max_length=255)
    status: str = Field(default="ready", pattern="^(ready|connected|paused)$")


class IngestionSourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    type: str
    name: str
    status: str
    created_at: datetime
