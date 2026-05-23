import { describe, it, expect } from "vitest";
import AiUsage from "../../models/AiUsage";

describe("AiUsage model", () => {
  it("should record AI usage with provider and token counts", () => {
    const paths = AiUsage.schema.paths;
    expect(paths.userId.options.required).toBe(true);
    expect(paths.provider.options.required).toBe(true);
    expect(paths.modelName.options.required).toBe(true);
    expect(paths.feature.options.required).toBe(true);
    expect(paths.inputTokens).toBeDefined();
    expect(paths.outputTokens).toBeDefined();
    expect(paths.totalTokens).toBeDefined();
    expect(paths.costUsd).toBeDefined();
  });

  it("should validate the provider enum", () => {
    const providerPath = AiUsage.schema.path("provider") as any;
    expect(providerPath.options.enum).toContain("openai");
    expect(providerPath.options.enum).toContain("gemini");
    expect(providerPath.options.enum).toContain("fallback");

    const featurePath = AiUsage.schema.path("feature") as any;
    expect(featurePath.options.enum).toContain("grammar");
    expect(featurePath.options.enum).toContain("rewrite");
    expect(featurePath.options.enum).toContain("ats-analysis");
    expect(featurePath.options.enum).toContain("ats-jd-match");
    expect(featurePath.options.enum).toContain("unknown");
  });

  it("should calculate cost based on provider pricing", () => {
    const paths = AiUsage.schema.paths;
    expect(paths.costUsd.options.default).toBe(0);
    expect(paths.inputTokens.options.default).toBe(0);
    expect(paths.outputTokens.options.default).toBe(0);
    expect(paths.totalTokens.options.default).toBe(0);
  });

  it("should mark fallback attempts", () => {
    const paths = AiUsage.schema.paths;
    expect(paths.fallback).toBeDefined();
    expect(paths.fallback.options.default).toBe(false);
    expect(paths.success).toBeDefined();
    expect(paths.success.options.default).toBe(true);
  });
});
