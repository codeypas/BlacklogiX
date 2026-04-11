# BlackLogix Agent SDK

This is the first Python SDK/agent for sending AI and system events into the
BlackLogix AIShield Ledger backend.

It uses the source API key that is generated in the dashboard and sends events to:

- `POST /events/ai`
- `POST /events/system`
- `POST /events/bulk`

## Install locally

From the repo root:

```bash
pip install -e sdk/python/blacklogix-agent
```

## Required values

Create these from the dashboard:

- organization
- project
- ingestion source

Then copy:

- project id
- source id
- source API key

## Environment example

```bash
export BLACKLOGIX_BASE_URL=http://localhost:8000
export BLACKLOGIX_PROJECT_ID=your-project-id
export BLACKLOGIX_SOURCE_ID=your-source-id
export BLACKLOGIX_SOURCE_KEY=your-source-api-key
```

## Manual client usage

```python
from blacklogix_agent import BlackLogixClient

client = BlackLogixClient(
    base_url="http://localhost:8000",
    project_id="your-project-id",
    source_id="your-source-id",
    source_api_key="your-source-api-key",
)

client.ingest_ai_event(
    event_type="model_inference",
    model_name="gpt-4o",
    model_version="v1",
    prompt="Summarize this incident",
    response="Summary generated.",
    confidence_score=0.84,
    metadata={"user_id": "7283", "latency_ms": 920},
)
```

## System event usage

```python
client.ingest_system_event(
    service="auth-service",
    level="error",
    event="failed_login_brute_force",
    metadata={"user_id": "7283", "failed_attempts": 22},
)
```

## Decorator-based AI monitoring

```python
from blacklogix_agent import AIInferenceMonitor

monitor = AIInferenceMonitor(
    client=client,
    model_name="demo-model",
    model_version="v1",
)

@monitor.monitor
def generate_summary(prompt: str) -> str:
    return f"Processed prompt: {prompt}"

generate_summary("Summarize suspicious activity")
```

The monitor records:

- prompt
- response
- model name
- model version
- latency

If the wrapped function throws an exception, the monitor records an error event and re-raises it.

## Example script

```bash
python sdk/python/blacklogix-agent/examples/send_events.py
```
