from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ReportSourceSummary(BaseModel):
    source_id: str
    source_name: str
    source_type: str
    status: str
    api_key_prefix: str | None
    last_key_rotated_at: datetime | None


class ReportRecentEvent(BaseModel):
    event_id: str
    kind: str
    source_name: str
    timestamp: datetime
    label: str
    actor_id: str | None
    chain_hash: str | None


class ReportRecentAlert(BaseModel):
    alert_id: str
    title: str
    severity: str
    status: str
    source_name: str
    score: float
    created_at: datetime


class ProjectAuditReportResponse(BaseModel):
    project_id: str
    project_name: str
    generated_at: datetime
    summary: str
    reporting_window: str
    total_events: int
    ai_events: int
    system_events: int
    total_alerts: int
    open_alerts: int
    critical_alerts: int
    verified_events: int
    invalid_events: int
    integrity_score_percent: float
    ready_sources: int
    connected_sources: int
    paused_sources: int
    source_count: int
    source_summaries: list[ReportSourceSummary]
    recent_events: list[ReportRecentEvent]
    recent_alerts: list[ReportRecentAlert]
