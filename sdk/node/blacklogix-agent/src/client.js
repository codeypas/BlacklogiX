export class BlackLogixError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "BlackLogixError";
    this.cause = options.cause;
  }
}

function isoformat(value) {
  const timestamp = value instanceof Date ? value : new Date();
  return timestamp.toISOString();
}

export class BlackLogixClient {
  constructor({
    baseUrl,
    projectId,
    sourceId,
    sourceApiKey,
    fetchImpl = globalThis.fetch,
  }) {
    if (!baseUrl || !projectId || !sourceId || !sourceApiKey) {
      throw new BlackLogixError(
        "baseUrl, projectId, sourceId, and sourceApiKey are required to initialize BlackLogixClient.",
      );
    }

    if (typeof fetchImpl !== "function") {
      throw new BlackLogixError("A fetch implementation is required. Use Node.js 18+ or provide fetchImpl.");
    }

    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.projectId = projectId;
    this.sourceId = sourceId;
    this.sourceApiKey = sourceApiKey;
    this.fetchImpl = fetchImpl;
  }

  ingestAiEvent({
    eventType,
    prompt = null,
    response = null,
    modelName = null,
    modelVersion = null,
    confidenceScore = null,
    metadata = {},
    rawPayload = null,
    timestamp = null,
  }) {
    return this.#post("/events/ai", {
      project_id: this.projectId,
      source_id: this.sourceId,
      timestamp: isoformat(timestamp),
      event_type: eventType,
      model_name: modelName,
      model_version: modelVersion,
      prompt,
      response,
      confidence_score: confidenceScore,
      metadata,
      raw_payload: rawPayload,
    });
  }

  ingestSystemEvent({
    service,
    level,
    event,
    metadata = {},
    rawPayload = null,
    timestamp = null,
  }) {
    return this.#post("/events/system", {
      project_id: this.projectId,
      source_id: this.sourceId,
      timestamp: isoformat(timestamp),
      service,
      level,
      event,
      metadata,
      raw_payload: rawPayload,
    });
  }

  ingestBulk({ aiEvents = [], systemEvents = [] } = {}) {
    return this.#post("/events/bulk", {
      ai_events: aiEvents.map((item) => ({
        project_id: this.projectId,
        source_id: this.sourceId,
        ...item,
        timestamp: item.timestamp ? isoformat(item.timestamp) : isoformat(),
      })),
      system_events: systemEvents.map((item) => ({
        project_id: this.projectId,
        source_id: this.sourceId,
        ...item,
        timestamp: item.timestamp ? isoformat(item.timestamp) : isoformat(),
      })),
    });
  }

  async #post(path, payload) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BlackLogix-Source-Key": this.sourceApiKey,
      },
      body: JSON.stringify(payload),
    }).catch((error) => {
      throw new BlackLogixError(`Unable to reach BlackLogix API: ${error instanceof Error ? error.message : "Unknown error"}`, {
        cause: error,
      });
    });

    const text = await response.text();
    const payloadResponse = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      const detail =
        payloadResponse && typeof payloadResponse === "object" && "detail" in payloadResponse
          ? String(payloadResponse.detail)
          : text || "Request failed";
      throw new BlackLogixError(`BlackLogix API request failed: ${response.status} ${detail}`);
    }

    return payloadResponse;
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
