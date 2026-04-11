from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.models import AIEvent, Alert, AlertSeverity, SystemEvent, User
from app.schemas.alert_schema import AlertDetailResponse, AlertListItem, AlertListResponse


class AlertService:
    ai_prompt_injection_terms = (
        "ignore previous instructions",
        "bypass safety",
        "reveal secret",
        "reveal system prompt",
        "developer instructions",
        "jailbreak",
    )
    ai_data_leak_terms = (
        "api_key",
        "access_token",
        "private key",
        "password",
        "secret",
        "ssn",
        "social security",
    )
    system_high_risk_terms = (
        "failed_login",
        "brute_force",
        "privilege_escalation",
        "data_egress",
        "geo_velocity",
        "malware",
    )

    def _build_alert_payload(
        self,
        *,
        alert_type: str,
        title: str,
        description: str,
        severity: AlertSeverity,
        score: float,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return {
            "alert_type": alert_type,
            "title": title,
            "description": description,
            "severity": severity.value,
            "score": score,
            "metadata": metadata or {},
        }

    def evaluate_ai_event(self, event: AIEvent) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []
        prompt = (event.prompt or "").lower()
        response = (event.response or "").lower()

        if any(term in prompt for term in self.ai_prompt_injection_terms):
            alerts.append(
                self._build_alert_payload(
                    alert_type="prompt_injection",
                    title="Prompt injection attempt detected",
                    description="The prompt contains instruction override or jailbreak language that may manipulate the model.",
                    severity=AlertSeverity.CRITICAL,
                    score=0.96,
                    metadata={"matched_prompt_terms": [term for term in self.ai_prompt_injection_terms if term in prompt]},
                )
            )

        if any(term in response for term in self.ai_data_leak_terms):
            alerts.append(
                self._build_alert_payload(
                    alert_type="data_leakage_risk",
                    title="Sensitive data leakage risk detected",
                    description="The generated response includes tokens associated with sensitive credentials or regulated identifiers.",
                    severity=AlertSeverity.HIGH,
                    score=0.89,
                    metadata={"matched_response_terms": [term for term in self.ai_data_leak_terms if term in response]},
                )
            )

        if event.confidence_score is not None and event.confidence_score < 0.35:
            alerts.append(
                self._build_alert_payload(
                    alert_type="low_model_confidence",
                    title="Low model confidence response",
                    description="The response confidence is below the safety threshold and should be reviewed before relying on the output.",
                    severity=AlertSeverity.MEDIUM,
                    score=round(1 - event.confidence_score, 2),
                    metadata={"confidence_score": event.confidence_score},
                )
            )

        return alerts

    def evaluate_system_event(self, event: SystemEvent) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []
        event_name = (event.event_name or "").lower()
        level = (event.level or "").lower()
        metadata = event.metadata_json or {}
        failed_attempts = metadata.get("failed_attempts")

        if any(term in event_name for term in self.system_high_risk_terms):
            alerts.append(
                self._build_alert_payload(
                    alert_type="suspicious_system_activity",
                    title="Suspicious system activity detected",
                    description="The system event name matches a high-risk security pattern that should be investigated.",
                    severity=AlertSeverity.HIGH,
                    score=0.87,
                    metadata={"event_name": event.event_name},
                )
            )

        if isinstance(failed_attempts, int) and failed_attempts >= 10:
            alerts.append(
                self._build_alert_payload(
                    alert_type="failed_login_spike",
                    title="Repeated failed login attempts",
                    description="The event metadata shows a spike in failed login attempts that may indicate brute-force activity.",
                    severity=AlertSeverity.CRITICAL if failed_attempts >= 20 else AlertSeverity.HIGH,
                    score=0.98 if failed_attempts >= 20 else 0.9,
                    metadata={"failed_attempts": failed_attempts, "ip": metadata.get("ip")},
                )
            )

        if level == "error":
            alerts.append(
                self._build_alert_payload(
                    alert_type="system_error_event",
                    title="High-signal error event recorded",
                    description="An error-level system event was ingested and should be reviewed for operational or security impact.",
                    severity=AlertSeverity.MEDIUM,
                    score=0.65,
                    metadata={"service": event.service, "event_name": event.event_name},
                )
            )

        return alerts

    async def create_alerts_for_ai_event(
        self,
        db_session: AsyncSession,
        *,
        event: AIEvent,
    ) -> list[Alert]:
        alert_payloads = self.evaluate_ai_event(event)
        created_alerts: list[Alert] = []
        for payload in alert_payloads:
            alert = await crud.create_alert(
                db_session,
                project_id=str(event.project_id),
                source_id=str(event.source_id),
                ai_event_id=str(event.id),
                alert_type=payload["alert_type"],
                title=payload["title"],
                description=payload["description"],
                severity=payload["severity"],
                score=payload["score"],
                metadata_json=payload["metadata"],
            )
            created_alerts.append(alert)
        return created_alerts

    async def create_alerts_for_system_event(
        self,
        db_session: AsyncSession,
        *,
        event: SystemEvent,
    ) -> list[Alert]:
        alert_payloads = self.evaluate_system_event(event)
        created_alerts: list[Alert] = []
        for payload in alert_payloads:
            alert = await crud.create_alert(
                db_session,
                project_id=str(event.project_id),
                source_id=str(event.source_id),
                system_event_id=str(event.id),
                alert_type=payload["alert_type"],
                title=payload["title"],
                description=payload["description"],
                severity=payload["severity"],
                score=payload["score"],
                metadata_json=payload["metadata"],
            )
            created_alerts.append(alert)
        return created_alerts

    def _to_alert_item(self, alert: Alert) -> AlertListItem:
        source = alert.source
        event_kind = "ai" if alert.ai_event_id is not None else "system"
        event_id = alert.ai_event_id or alert.system_event_id
        return AlertListItem(
            id=alert.id,
            project_id=alert.project_id,
            source_id=alert.source_id,
            source_name=source.name if source else "Unknown source",
            source_type=source.type if source else "unknown",
            event_kind=event_kind,
            event_id=event_id,
            alert_type=alert.alert_type,
            title=alert.title,
            description=alert.description,
            severity=alert.severity,
            status=alert.status,
            score=alert.score,
            created_at=alert.created_at,
        )

    async def list_alerts(
        self,
        db_session: AsyncSession,
        *,
        user: User,
        project_id: str | None = None,
        source_id: str | None = None,
        severity: str | None = None,
        status_value: str | None = None,
        limit: int = 50,
    ) -> AlertListResponse:
        alerts = await crud.list_alerts_for_user(
            db_session,
            user_id=str(user.id),
            project_id=project_id,
            source_id=source_id,
            severity=severity,
            status=status_value,
            limit=limit,
        )
        items = [self._to_alert_item(alert) for alert in alerts]
        return AlertListResponse(items=items, total_returned=len(items))

    async def get_alert_detail(
        self,
        db_session: AsyncSession,
        *,
        user: User,
        alert_id: str,
    ) -> AlertDetailResponse:
        alert = await crud.get_alert_for_user(
            db_session,
            alert_id=alert_id,
            user_id=str(user.id),
        )
        if alert is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found or inaccessible",
            )

        item = self._to_alert_item(alert)
        return AlertDetailResponse(
            **item.model_dump(),
            metadata=alert.metadata_json or {},
        )


alert_service = AlertService()
