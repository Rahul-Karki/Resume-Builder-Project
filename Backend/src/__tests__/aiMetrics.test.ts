import { describe, it, expect, vi, beforeEach } from "vitest";
import { metricsRegistry } from "../observability";

describe("aiMetrics", () => {
  beforeEach(() => {
    metricsRegistry.resetMetrics();
  });

  describe("trackAiRequest", () => {
    it("should increment the request counter with provider and feature labels", async () => {
      const { aiRequestsTotal, trackAiRequest } = await import("../observability/aiMetrics");
      trackAiRequest("improve-text", "openai", "success", 100, { input: 10, output: 20 });
      const metric = await metricsRegistry.getSingleMetricAsString("resume_builder_ai_requests_total");
      expect(metric).toContain("resume_builder_ai_requests_total");
      expect(metric).toContain("openai");
    });
    it("should record request duration", async () => {
      const { aiRequestDurationSeconds, trackAiRequest } = await import("../observability/aiMetrics");
      trackAiRequest("improve-text", "openai", "success", 500, { input: 5, output: 10 });
      const metric = await metricsRegistry.getSingleMetricAsString("resume_builder_ai_request_duration_seconds");
      expect(metric).toContain("resume_builder_ai_request_duration_seconds");
    });
  });
  describe("trackAiFallback", () => {
    it("should increment the fallback counter when provider switches", async () => {
      const { aiFallbackRate, trackAiRequest } = await import("../observability/aiMetrics");
      trackAiRequest("improve-text", "gemini", "success", 200, undefined, true);
      const metric = await metricsRegistry.getSingleMetricAsString("resume_builder_ai_fallback_rate");
      expect(metric).toContain("resume_builder_ai_fallback_rate");
    });
  });
  describe("trackAiTokens", () => {
    it("should record token usage by model", async () => {
      const { aiTokensUsedTotal, trackAiRequest } = await import("../observability/aiMetrics");
      trackAiRequest("improve-text", "gpt-4", "success", 300, { input: 50, output: 100 });
      const metric = await metricsRegistry.getSingleMetricAsString("resume_builder_ai_tokens_used_total");
      expect(metric).toContain("resume_builder_ai_tokens_used_total");
    });
  });
});
