from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.database import AsyncSessionLocal
from app.db.models import AIEvent, Alert, AlertSeverity, AlertStatus, SystemEvent, User
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
    ai_low_confidence_threshold = 0.45
    ai_low_confidence_burst_count = 3
    ai_actor_velocity_count = 5
    system_error_burst_count = 5
    system_repeat_event_count = 4
    system_auth_cluster_count = 3

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

    async def evaluate_ai_anomalies(
        self,
        db_session: AsyncSession,
        *,
        event: AIEvent,
    ) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []
        metadata = event.metadata_json or {}
        actor_id = metadata.get("actor_id") or metadata.get("user_id")
        ten_minutes_ago = event.timestamp - timedelta(minutes=10)
        fifteen_minutes_ago = event.timestamp - timedelta(minutes=15)
        two_minutes_ago = event.timestamp - timedelta(minutes=2)

        matched_terms = [term for term in self.ai_prompt_injection_terms if term in (event.prompt or "").lower()]
        if matched_terms:
            recent_prompt_attacks = await crud.count_recent_ai_events_with_prompt_terms(
                db_session,
                source_id=str(event.source_id),
                since=ten_minutes_ago,
                terms=list(matched_terms),
            )
            if recent_prompt_attacks >= 3:
                alerts.append(
                    self._build_alert_payload(
                        alert_type="prompt_attack_burst",
                        title="Repeated prompt attack pattern detected",
                        description="Multiple recent prompts from the same source contain instruction override or jailbreak markers, indicating an active attack burst.",
                        severity=AlertSeverity.CRITICAL,
                        score=0.99,
                        metadata={
                            "matched_prompt_terms": matched_terms,
                            "recent_prompt_attack_events": recent_prompt_attacks,
                            "window_minutes": 10,
                        },
                    )
                )

        if event.confidence_score is not None and event.confidence_score < self.ai_low_confidence_threshold:
            low_confidence_count = await crud.count_recent_ai_events_for_source(
                db_session,
                source_id=str(event.source_id),
                since=fifteen_minutes_ago,
                confidence_below=self.ai_low_confidence_threshold,
            )
            if low_confidence_count >= self.ai_low_confidence_burst_count:
                alerts.append(
                    self._build_alert_payload(
                        alert_type="low_confidence_burst",
                        title="Low-confidence response burst detected",
                        description="Multiple recent AI responses from this source fell below the confidence threshold, suggesting degraded model reliability or prompt manipulation.",
                        severity=AlertSeverity.HIGH,
                        score=0.91,
                        metadata={
                            "confidence_threshold": self.ai_low_confidence_threshold,
                            "recent_low_confidence_events": low_confidence_count,
                            "window_minutes": 15,
                        },
                    )
                )

        if actor_id:
            actor_burst_count = await crud.count_recent_ai_events_for_source(
                db_session,
                source_id=str(event.source_id),
                since=two_minutes_ago,
                actor_id=str(actor_id),
            )
            if actor_burst_count >= self.ai_actor_velocity_count:
                alerts.append(
                    self._build_alert_payload(
                        alert_type="ai_actor_velocity",
                        title="Abnormal AI request velocity detected",
                        description="The same actor generated an unusual burst of AI requests in a short window, which may indicate abuse, automation, or prompt probing.",
                        severity=AlertSeverity.HIGH,
                        score=0.88,
                        metadata={
                            "actor_id": actor_id,
                            "recent_actor_event_count": actor_burst_count,
                            "window_minutes": 2,
                        },
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

    async def evaluate_system_anomalies(
        self,
        db_session: AsyncSession,
        *,
        event: SystemEvent,
    ) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []
        metadata = event.metadata_json or {}
        actor_id = metadata.get("actor_id") or metadata.get("user_id")
        ip = metadata.get("ip")
        ten_minutes_ago = event.timestamp - timedelta(minutes=10)
        fifteen_minutes_ago = event.timestamp - timedelta(minutes=15)

        if (event.level or "").lower() == "error":
            error_burst_count = await crud.count_recent_system_events_for_source(
                db_session,
                source_id=str(event.source_id),
                since=ten_minutes_ago,
                service=event.service,
                level=event.level,
            )
            if error_burst_count >= self.system_error_burst_count:
                alerts.append(
                    self._build_alert_payload(
                        alert_type="system_error_burst",
                        title="Error burst detected for service",
                        description="A concentrated burst of error-level events was observed for the same service, which may indicate service instability or active disruption.",
                        severity=AlertSeverity.HIGH,
                        score=0.86,
                        metadata={
                            "service": event.service,
                            "recent_error_events": error_burst_count,
                            "window_minutes": 10,
                        },
                    )
                )

        repeated_event_count = await crud.count_recent_system_events_for_source(
            db_session,
            source_id=str(event.source_id),
            since=fifteen_minutes_ago,
            event_name=event.event_name,
            service=event.service,
        )
        if repeated_event_count >= self.system_repeat_event_count:
            alerts.append(
                self._build_alert_payload(
                    alert_type="repeated_system_event",
                    title="Repeated suspicious system event detected",
                    description="The same system event repeated across a short time window, suggesting a sustained issue or coordinated attack behavior.",
                    severity=AlertSeverity.HIGH,
                    score=0.84,
                    metadata={
                        "service": event.service,
                        "event_name": event.event_name,
                        "recent_repeat_count": repeated_event_count,
                        "window_minutes": 15,
                    },
                )
            )

        auth_cluster_trigger = "failed_login" in (event.event_name or "").lower() or "brute_force" in (event.event_name or "").lower()
        if auth_cluster_trigger and (actor_id or ip):
            auth_cluster_count = await crud.count_recent_system_events_for_source(
                db_session,
                source_id=str(event.source_id),
                since=ten_minutes_ago,
                actor_id=str(actor_id) if actor_id else None,
                ip=str(ip) if ip else None,
            )
            if auth_cluster_count >= self.system_auth_cluster_count:
                alerts.append(
                    self._build_alert_payload(
                        alert_type="auth_failure_cluster",
                        title="Authentication failure cluster detected",
                        description="Repeated authentication failures from the same actor or IP were detected in a tight time window, indicating probable credential attack behavior.",
                        severity=AlertSeverity.CRITICAL,
                        score=0.97,
                        metadata={
                            "actor_id": actor_id,
                            "ip": ip,
                            "recent_auth_failures": auth_cluster_count,
                            "window_minutes": 10,
                        },
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
        alert_payloads.extend(await self.evaluate_ai_anomalies(db_session, event=event))
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
        alert_payloads.extend(await self.evaluate_system_anomalies(db_session, event=event))
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

    async def process_ai_event_background(
        self,
        *,
        event_id: str,
    ) -> None:
        async with AsyncSessionLocal() as db_session:
            event = await crud.get_ai_event_by_id(db_session, event_id)
            if event is None:
                return
            await self.create_alerts_for_ai_event(db_session, event=event)

    async def process_system_event_background(
        self,
        *,
        event_id: str,
    ) -> None:
        async with AsyncSessionLocal() as db_session:
            event = await crud.get_system_event_by_id(db_session, event_id)
            if event is None:
                return
            await self.create_alerts_for_system_event(db_session, event=event)

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

    async def update_alert_status(
        self,
        db_session: AsyncSession,
        *,
        user: User,
        alert_id: str,
        status_value: str,
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

        updated_alert = await crud.update_alert_status(
            db_session,
            alert=alert,
            status=status_value,
        )
        item = self._to_alert_item(updated_alert)
        return AlertDetailResponse(
            **item.model_dump(),
            metadata=updated_alert.metadata_json or {},
        )

    async def acknowledge_alert(
        self,
        db_session: AsyncSession,
        *,
        user: User,
        alert_id: str,
    ) -> AlertDetailResponse:
        return await self.update_alert_status(
            db_session,
            user=user,
            alert_id=alert_id,
            status_value=AlertStatus.ACKNOWLEDGED.value,
        )

    async def resolve_alert(
        self,
        db_session: AsyncSession,
        *,
        user: User,
        alert_id: str,
    ) -> AlertDetailResponse:
        return await self.update_alert_status(
            db_session,
            user=user,
            alert_id=alert_id,
            status_value=AlertStatus.RESOLVED.value,
        )


alert_service = AlertService()
