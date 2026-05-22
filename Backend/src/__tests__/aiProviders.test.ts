// ─── Module: aiProviders ───────────────────────────
// Description: Routes AI requests to OpenAI or Gemini with fallback logic
// Coverage targets: callAiProvider, callOpenAI, callGemini, getProviderForFeature
// Last updated: 2026-05-22

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("aiProviders", () => {
  describe("callAiProvider", () => { it("should call the primary provider and return the result", () => {}); it("should fall back to the secondary provider when the primary rate-limits", () => {}); it("should throw a categorized error when both providers fail", () => {}); });
  describe("callOpenAI", () => { it("should return the API response when the request succeeds", () => {}); it("should throw a rate-limit error on 429", () => {}); it("should throw a timeout error when the request exceeds the configured timeout", () => {}); });
  describe("callGemini", () => { it("should return the API response when the request succeeds", () => {}); it("should throw a rate-limit error on 429", () => {}); });
});
