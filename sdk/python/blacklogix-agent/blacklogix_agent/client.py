from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from urllib import error, request


class BlackLogixError(RuntimeError):
    pass


def _isoformat(value: datetime | None) -> str:
    timestamp = value or datetime.now(timezone.utc)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    return timestamp.isoformat()


class BlackLogixClient:
    def __init__(
        self,
        *,
        base_url: str,
        project_id: str,
        source_id: str,
        source_api_key: str,
        timeout: float = 10.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.project_id = project_id
        self.source_id = source_id
        self.source_api_key = source_api_key
        self.timeout = timeout

    def ingest_ai_event(
        self,
        *,
        event_type: str,
        prompt: str | None = None,
        response: str | None = None,
        model_name: str | None = None,
        model_version: str | None = None,
        confidence_score: float | None = None,
        metadata: dict[str, Any] | None = None,
        raw_payload: dict[str, Any] | None = None,
        timestamp: datetime | None = None,
    ) -> dict[str, Any]:
        return self._post(
            "/events/ai",
            {
                "project_id": self.project_id,
                "source_id": self.source_id,
                "timestamp": _isoformat(timestamp),
                "event_type": event_type,
                "model_name": model_name,
                "model_version": model_version,
                "prompt": prompt,
                "response": response,
                "confidence_score": confidence_score,
                "metadata": metadata or {},
                "raw_payload": raw_payload,
            },
        )

    def ingest_system_event(
        self,
        *,
        service: str,
        level: str,
        event: str,
        metadata: dict[str, Any] | None = None,
        raw_payload: dict[str, Any] | None = None,
        timestamp: datetime | None = None,
    ) -> dict[str, Any]:
        return self._post(
            "/events/system",
            {
                "project_id": self.project_id,
                "source_id": self.source_id,
                "timestamp": _isoformat(timestamp),
                "service": service,
                "level": level,
                "event": event,
                "metadata": metadata or {},
                "raw_payload": raw_payload,
            },
        )

    def ingest_bulk(
        self,
        *,
        ai_events: list[dict[str, Any]] | None = None,
        system_events: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        return self._post(
            "/events/bulk",
            {
                "ai_events": [
                    {
                        "project_id": self.project_id,
                        "source_id": self.source_id,
                        **item,
                    }
                    for item in (ai_events or [])
                ],
                "system_events": [
                    {
                        "project_id": self.project_id,
                        "source_id": self.source_id,
                        **item,
                    }
                    for item in (system_events or [])
                ],
            },
        )

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        serialized = json.dumps(
            {key: value for key, value in payload.items() if value is not None},
            separators=(",", ":"),
        ).encode("utf-8")
        req = request.Request(
            url=f"{self.base_url}{path}",
            data=serialized,
            headers={
                "Content-Type": "application/json",
                "X-BlackLogix-Source-Key": self.source_api_key,
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=self.timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8")
            raise BlackLogixError(f"BlackLogix API request failed: {exc.code} {detail}") from exc
        except error.URLError as exc:
            raise BlackLogixError(f"Unable to reach BlackLogix API: {exc.reason}") from exc
