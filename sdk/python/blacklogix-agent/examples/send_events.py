from __future__ import annotations

import os
from uuid import uuid4

from blacklogix_agent import AIInferenceMonitor, BlackLogixClient


def main() -> None:
    request_id = f"py-{uuid4()}"
    client = BlackLogixClient(
        base_url=os.environ.get("BLACKLOGIX_BASE_URL", "http://localhost:8000"),
        project_id=os.environ["BLACKLOGIX_PROJECT_ID"],
        source_id=os.environ["BLACKLOGIX_SOURCE_ID"],
        source_api_key=os.environ["BLACKLOGIX_SOURCE_KEY"],
    )

    client.ingest_system_event(
        service="auth-service",
        level="info",
        event="agent_boot",
        metadata={
            "host": "local-demo",
            "request_id": request_id,
            "risk_flags": ["sdk_boot_event"],
        },
        raw_payload={
            "message": "Python SDK boot sequence started",
        },
    )

    monitor = AIInferenceMonitor(
        client=client,
        model_name="demo-model",
        model_version="v1",
    )

    @monitor.monitor
    def generate_summary(prompt: str) -> str:
        return f"Processed prompt: {prompt}"

    generate_summary("Summarize suspicious activity from the last hour")

    client.ingest_ai_event(
        event_type="model_inference",
        model_name="demo-model",
        model_version="2026.04",
        prompt="Summarize suspicious activity for account 42",
        response="No confirmed attack was detected in this sample.",
        confidence_score=0.91,
        metadata={
            "user_id": "pilot-user-42",
            "request_id": request_id,
            "session_id": "pilot-session-1",
            "latency_ms": 438,
            "risk_flags": ["pilot_live_event"],
            "training_data_hash": "train_hash_demo_v1",
        },
        raw_payload={
            "input": {"message": "Summarize suspicious activity for account 42"},
            "output": {"text": "No confirmed attack was detected in this sample."},
            "training_data_hash": "train_hash_demo_v1",
        },
    )


if __name__ == "__main__":
    main()
