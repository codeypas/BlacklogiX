export class AIInferenceMonitor {
  constructor({
    client,
    modelName,
    modelVersion = null,
    defaultEventType = "model_inference",
    bestEffort = true,
  }) {
    this.client = client;
    this.modelName = modelName;
    this.modelVersion = modelVersion;
    this.defaultEventType = defaultEventType;
    this.bestEffort = bestEffort;
  }

  async record({
    prompt = null,
    response = null,
    confidenceScore = null,
    metadata = {},
    rawPayload = null,
    eventType = null,
  }) {
    try {
      return await this.client.ingestAiEvent({
        eventType: eventType || this.defaultEventType,
        prompt,
        response,
        modelName: this.modelName,
        modelVersion: this.modelVersion,
        confidenceScore,
        metadata,
        rawPayload,
      });
    } catch (error) {
      if (!this.bestEffort) {
        throw error;
      }
      return null;
    }
  }

  monitor(fn) {
    return async (...args) => {
      const startedAt = performance.now();
      const firstArg = args.length > 0 ? args[0] : undefined;
      const prompt = typeof firstArg === "string" ? firstArg : null;

      try {
        const result = await fn(...args);
        const latencyMs = Number((performance.now() - startedAt).toFixed(2));
        await this.record({
          prompt,
          response: result == null ? null : String(result),
          metadata: { latency_ms: latencyMs },
        });
        return result;
      } catch (error) {
        const latencyMs = Number((performance.now() - startedAt).toFixed(2));
        await this.record({
          prompt,
          response: null,
          eventType: "model_inference_error",
          metadata: {
            latency_ms: latencyMs,
            exception_type: error instanceof Error ? error.name : "Error",
            exception_message: error instanceof Error ? error.message : String(error),
          },
        });
        throw error;
      }
    };
  }
}
