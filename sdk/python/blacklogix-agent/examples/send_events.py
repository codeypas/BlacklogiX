from __future__ import annotations

import os

from blacklogix_agent import AIInferenceMonitor, BlackLogixClient


def main() -> None:
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
        metadata={"host": "local-demo"},
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


if __name__ == "__main__":
    main()
