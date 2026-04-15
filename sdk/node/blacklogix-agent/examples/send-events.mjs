import { randomUUID } from "node:crypto";

import { AIInferenceMonitor, BlackLogixClient } from "../index.js";

const requestId = `node-${randomUUID()}`;

const client = new BlackLogixClient({
  baseUrl: process.env.BLACKLOGIX_BASE_URL || "http://localhost:8000",
  projectId: process.env.BLACKLOGIX_PROJECT_ID,
  sourceId: process.env.BLACKLOGIX_SOURCE_ID,
  sourceApiKey: process.env.BLACKLOGIX_SOURCE_KEY,
});

await client.ingestSystemEvent({
  service: "auth-service",
  level: "info",
  event: "agent_boot",
  metadata: {
    host: "node-demo",
    request_id: requestId,
    risk_flags: ["sdk_boot_event"],
  },
  rawPayload: {
    message: "Node SDK boot sequence started",
  },
});

const monitor = new AIInferenceMonitor({
  client,
  modelName: "demo-model",
  modelVersion: "v1",
});

const generateSummary = monitor.monitor(async (prompt) => `Processed prompt: ${prompt}`);

await generateSummary("Summarize suspicious activity from the last hour");

await client.ingestAiEvent({
  eventType: "model_inference",
  modelName: "demo-model",
  modelVersion: "2026.04",
  prompt: "Summarize suspicious activity for account 42",
  response: "No confirmed attack was detected in this sample.",
  confidenceScore: 0.91,
  metadata: {
    user_id: "pilot-user-42",
    request_id: requestId,
    session_id: "pilot-session-1",
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

console.log("Node SDK example sent events successfully.");
