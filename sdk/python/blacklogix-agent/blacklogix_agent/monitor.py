from __future__ import annotations

import functools
import time
from collections.abc import Callable
from typing import Any

from .client import BlackLogixClient


class AIInferenceMonitor:
    def __init__(
        self,
        *,
        client: BlackLogixClient,
        model_name: str,
        model_version: str | None = None,
        default_event_type: str = "model_inference",
        best_effort: bool = True,
    ) -> None:
        self.client = client
        self.model_name = model_name
        self.model_version = model_version
        self.default_event_type = default_event_type
        self.best_effort = best_effort

    def record(
        self,
        *,
        prompt: str | None,
        response: str | None,
        confidence_score: float | None = None,
        metadata: dict[str, Any] | None = None,
        raw_payload: dict[str, Any] | None = None,
        event_type: str | None = None,
    ) -> dict[str, Any] | None:
        try:
            return self.client.ingest_ai_event(
                event_type=event_type or self.default_event_type,
                prompt=prompt,
                response=response,
                model_name=self.model_name,
                model_version=self.model_version,
                confidence_score=confidence_score,
                metadata=metadata or {},
                raw_payload=raw_payload,
            )
        except Exception:
            if not self.best_effort:
                raise
            return None

    def monitor(self, func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapped(*args: Any, **kwargs: Any) -> Any:
            start_time = time.perf_counter()
            prompt = kwargs.get("prompt")
            if prompt is None and args:
                prompt = args[0]

            try:
                result = func(*args, **kwargs)
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                self.record(
                    prompt=str(prompt) if prompt is not None else None,
                    response=str(result) if result is not None else None,
                    metadata={"latency_ms": latency_ms},
                )
                return result
            except Exception as exc:
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                self.record(
                    prompt=str(prompt) if prompt is not None else None,
                    response=None,
                    metadata={
                        "latency_ms": latency_ms,
                        "exception_type": exc.__class__.__name__,
                        "exception_message": str(exc),
                    },
                    event_type="model_inference_error",
                )
                raise

        return wrapped
