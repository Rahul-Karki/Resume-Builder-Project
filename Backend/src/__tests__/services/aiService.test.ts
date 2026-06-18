import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock AiUsage model so mongoose operations don't time out in tests
vi.mock("../../models/AiUsage", () => ({
  default: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../../observability");

describe("aiService", () => {
  describe("fingerprintText", () => {
    it("should return a consistent SHA-1 hash for the same input", async () => {
      const { fingerprintText } = await import("../../services/aiService");
      const hash1 = fingerprintText("Hello World");
      const hash2 = fingerprintText("Hello World");
      expect(hash1).toBe(hash2);
    });

    it("should return different hashes for different inputs", async () => {
      const { fingerprintText } = await import("../../services/aiService");
      const hash1 = fingerprintText("Hello World");
      const hash2 = fingerprintText("Hello World!");
      expect(hash1).not.toBe(hash2);
    });

    it("should normalize whitespace before hashing", async () => {
      const { fingerprintText } = await import("../../services/aiService");
      const hash1 = fingerprintText("Hello   World");
      const hash2 = fingerprintText("Hello World");
      expect(hash1).toBe(hash2);
    });

    it("should handle null/undefined as empty string", async () => {
      const { fingerprintText } = await import("../../services/aiService");
      const hash1 = fingerprintText(null);
      const hash2 = fingerprintText(undefined);
      expect(hash1).toBe(hash2);
    });
  });

  describe("improveText fallback behavior", () => {
    beforeAll(() => {
      // Ensure AI calls will fail fast (no real API keys)
      vi.stubEnv("OPENAI_API_KEY", "");
      vi.stubEnv("GEMINI_API_KEY", "");
    });

    it("should return a fallback rewrite even when AI calls fail", async () => {
      const { improveText } = await import("../../services/aiService");
      const result = await improveText({
        text: "worked on a project",
        section: "experience",
        tone: "professional",
        userId: "test-user",
      });
      expect(result).toBeDefined();
      expect(result.improvedText).toBeTruthy();
      expect(result.detectedWeaknesses).toBeInstanceOf(Array);
      expect(result.recruiterSignalsAdded).toBeInstanceOf(Array);
    });
  });

  describe("enhanceBullet fallback behavior", () => {
    beforeAll(() => {
      vi.stubEnv("OPENAI_API_KEY", "");
      vi.stubEnv("GEMINI_API_KEY", "");
    });

    it("should return a fallback enhancement even when AI calls fail", async () => {
      const { enhanceBullet } = await import("../../services/aiService");
      const result = await enhanceBullet({
        text: "led a team",
        section: "experience",
        tone: "technical",
        userId: "test-user",
      });
      expect(result).toBeDefined();
      expect(result.improvedText).toBeTruthy();
      expect(result.variations).toBeInstanceOf(Array);
      expect(result.variations.length).toBeGreaterThan(0);
    });
  });
});
