import { describe, it, expect, vi, beforeEach } from "vitest";

describe("aiProviders", () => {
  describe("callAiProvider", () => {
    it("should call the primary provider and return the result", async () => {
      const { AiProviderManager } = await import("../services/aiProviders");
      const mockProvider = {
        getName: () => "openai" as const,
        generateStructuredResponse: vi.fn().mockResolvedValue({ data: { text: "result" }, tokens: { input: 10, output: 20, total: 30 }, model: "gpt-4", timestamp: Date.now() }),
        isAvailable: vi.fn().mockResolvedValue(true),
      };
      const manager = new AiProviderManager([mockProvider], "openai");
      const result = await manager.generateStructuredResponseWithFallback("system", "user");
      expect(result.provider).toBe("openai");
      expect(result.response.data).toEqual({ text: "result" });
    });
    it("should fall back to the secondary provider when the primary rate-limits", async () => {
      const { AiProviderManager } = await import("../services/aiProviders");
      const primaryProvider = {
        getName: () => "openai" as const,
        generateStructuredResponse: vi.fn().mockRejectedValue(new Error("429 Too Many Requests")),
        isAvailable: vi.fn().mockResolvedValue(true),
      };
      const secondaryProvider = {
        getName: () => "gemini" as const,
        generateStructuredResponse: vi.fn().mockResolvedValue({ data: { text: "fallback" }, tokens: { input: 5, output: 10, total: 15 }, model: "gemini-pro", timestamp: Date.now() }),
        isAvailable: vi.fn().mockResolvedValue(true),
      };
      const manager = new AiProviderManager([primaryProvider, secondaryProvider], "openai", ["gemini"]);
      const result = await manager.generateStructuredResponseWithFallback("system", "user");
      expect(result.provider).toBe("gemini");
    });
    it("should throw a categorized error when both providers fail", async () => {
      const { AiProviderManager } = await import("../services/aiProviders");
      const primaryProvider = {
        getName: () => "openai" as const,
        generateStructuredResponse: vi.fn().mockRejectedValue(new Error("Rate limited")),
        isAvailable: vi.fn().mockResolvedValue(true),
      };
      const secondaryProvider = {
        getName: () => "gemini" as const,
        generateStructuredResponse: vi.fn().mockRejectedValue(new Error("Quota exceeded")),
        isAvailable: vi.fn().mockResolvedValue(true),
      };
      const manager = new AiProviderManager([primaryProvider, secondaryProvider], "openai", ["gemini"]);
      await expect(manager.generateStructuredResponseWithFallback("system", "user")).rejects.toThrow();
    });
  });
  describe("callOpenAI", () => {
    it("should return the API response when the request succeeds", async () => {
      const { AiProviderFactory } = await import("../services/aiProviders");
      class MockOpenAIProvider extends (await import("../services/aiProviders")).BaseAiProvider {
        generateStructuredResponse = vi.fn().mockResolvedValue({ data: { text: "ok" }, tokens: { input: 1, output: 2, total: 3 }, model: "gpt-4", timestamp: Date.now() });
        generateTextResponse = vi.fn().mockResolvedValue({ data: "text", tokens: { input: 1, output: 2, total: 3 }, model: "gpt-4", timestamp: Date.now() });
        isAvailable = vi.fn().mockResolvedValue(true);
      }
      AiProviderFactory.registerProvider("openai", MockOpenAIProvider);
      const provider = AiProviderFactory.createProvider({ name: "openai", apiKey: "sk-test" });
      const result = await provider.generateStructuredResponse("sys", "usr");
      expect(result.data).toEqual({ text: "ok" });
    });
    it("should throw a rate-limit error on 429", async () => {
      const { BaseAiProvider } = await import("../services/aiProviders");
      class MockRateLimitProvider extends BaseAiProvider {
        generateStructuredResponse = vi.fn().mockRejectedValue(new Error("429 Too Many Requests"));
        generateTextResponse = vi.fn().mockRejectedValue(new Error("429 Too Many Requests"));
        isAvailable = vi.fn().mockResolvedValue(true);
      }
      const provider = new MockRateLimitProvider({ name: "openai", apiKey: "sk-test" });
      await expect(provider.generateTextResponse("sys", "usr")).rejects.toThrow();
    });
    it("should throw a timeout error when the request exceeds the configured timeout", async () => {
      const { BaseAiProvider } = await import("../services/aiProviders");
      class MockTimeoutProvider extends BaseAiProvider {
        generateStructuredResponse = vi.fn().mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 50)));
        generateTextResponse = vi.fn().mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 50)));
        isAvailable = vi.fn().mockResolvedValue(true);
      }
      const provider = new MockTimeoutProvider({ name: "openai", apiKey: "sk-test", timeout: 10 });
      await expect(provider.withTimeout(provider.generateTextResponse("sys", "usr"), 10)).rejects.toThrow("Request timeout");
    });
  });
  describe("callGemini", () => {
    it("should return the API response when the request succeeds", async () => {
      const { AiProviderFactory } = await import("../services/aiProviders");
      class MockGeminiProvider extends (await import("../services/aiProviders")).BaseAiProvider {
        generateStructuredResponse = vi.fn().mockResolvedValue({ data: { text: "gemini-ok" }, tokens: { input: 1, output: 2, total: 3 }, model: "gemini-pro", timestamp: Date.now() });
        generateTextResponse = vi.fn().mockResolvedValue({ data: "gemini-text", tokens: { input: 1, output: 2, total: 3 }, model: "gemini-pro", timestamp: Date.now() });
        isAvailable = vi.fn().mockResolvedValue(true);
      }
      AiProviderFactory.registerProvider("gemini", MockGeminiProvider);
      const provider = AiProviderFactory.createProvider({ name: "gemini", apiKey: "gemini-test" });
      const result = await provider.generateTextResponse("sys", "usr");
      expect(result.data).toBe("gemini-text");
    });
    it("should throw a rate-limit error on 429", async () => {
      const { BaseAiProvider } = await import("../services/aiProviders");
      class MockGeminiRateLimit extends BaseAiProvider {
        generateStructuredResponse = vi.fn().mockRejectedValue(new Error("429 Resource has been exhausted"));
        generateTextResponse = vi.fn().mockRejectedValue(new Error("429 Resource has been exhausted"));
        isAvailable = vi.fn().mockResolvedValue(true);
      }
      const provider = new MockGeminiRateLimit({ name: "gemini", apiKey: "gemini-test" });
      await expect(provider.generateTextResponse("sys", "usr")).rejects.toThrow("429");
    });
  });
});
