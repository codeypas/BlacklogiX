# BlackLogix Agent SDK for Node.js

This is the first Node.js SDK for sending AI and system events into the
BlackLogix AIShield Ledger backend.

It uses the source API key generated in the dashboard and sends events to:

- `POST /events/ai`
- `POST /events/system`
- `POST /events/bulk`

## Install locally

From the repo root:

```bash
npm install ./sdk/node/blacklogix-agent
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

For a full pilot walkthrough, including recommended AI fields such as
`training_data_hash`, `risk_flags`, `request_id`, and integrity verification steps,
see:

```text
docs/pilot-integration-guide.md
```

## Environment example

```bash
export BLACKLOGIX_BASE_URL=http://localhost:8000
export BLACKLOGIX_PROJECT_ID=your-project-id
export BLACKLOGIX_SOURCE_ID=your-source-id
export BLACKLOGIX_SOURCE_KEY=your-source-api-key
```

## Manual client usage

```js
import { BlackLogixClient } from "blacklogix-agent";

const client = new BlackLogixClient({
  baseUrl: "http://localhost:8000",
  projectId: "your-project-id",
  sourceId: "your-source-id",
  sourceApiKey: "your-source-api-key",
});

await client.ingestAiEvent({
  eventType: "model_inference",
  modelName: "pilot-model",
  modelVersion: "2026.04",
  prompt: "Summarize suspicious activity for account 42",
  response: "No confirmed attack was detected in this sample.",
  confidenceScore: 0.91,
  metadata: {
    user_id: "pilot-user-42",
    request_id: "req-1001",
    session_id: "sess-1",
    latency_ms: 438,
    risk_flags: ["pilot_live_event"],
    training_data_hash: "train_hash_demo_v1",
  },
  rawPayload: {
    input: { message: "Summarize suspicious activity for account 42" },
    output: { text: "No confirmed attack was detected in this sample." },
    training_data_hash: "train_hash_demo_v1",
  },
});
```

## System event usage

```js
await client.ingestSystemEvent({
  service: "auth-service",
  level: "error",
  event: "failed_login_brute_force",
  metadata: {
    user_id: "pilot-user-42",
    ip: "127.0.0.1",
    request_id: "req-1002",
    failed_attempts: 22,
  },
  rawPayload: {
    reason: "Burst of failed login attempts detected by auth-service",
  },
});
```

## Wrapper-based AI monitoring

```js
import { AIInferenceMonitor } from "blacklogix-agent";

const monitor = new AIInferenceMonitor({
  client,
  modelName: "demo-model",
  modelVersion: "v1",
});

const generateSummary = monitor.monitor(async (prompt) => {
  return `Processed prompt: ${prompt}`;
});

await generateSummary("Summarize suspicious activity");
```

The monitor records:

- prompt
- response
- model name
- model version
- latency

If the wrapped function throws an exception, the monitor records an error event and re-throws it.

## Example script

```bash
node sdk/node/blacklogix-agent/examples/send-events.mjs
```
