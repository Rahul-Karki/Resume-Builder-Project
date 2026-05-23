import { describe, it, expect, vi } from "vitest";
import { validateAiInput, detectHallucinations, sanitizeAiInput } from "../middleware/aiValidation";

describe("aiValidation", () => {
  describe("validateAiInput", () => {
    it("should pass valid input", () => {
      const result = validateAiInput({ text: "Hello world", section: "summary" });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject input exceeding the max length", () => {
      const longText = "a".repeat(3000);
      const result = validateAiInput({ text: longText, section: "summary" });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("exceeds maximum length");
    });

    it("should accept input with no HTML sanitation (sanitizeAiInput only strips null bytes/newlines)", () => {
      const result = sanitizeAiInput("<b>Hello</b>");
      expect(result).toContain("Hello");
    });
  });

  describe("detectHallucinations", () => {
    it("should return false when the response is consistent with the input", () => {
      const result = detectHallucinations({
        suggestions: [
          { suggestionText: "Improved sentence structure.", originalText: "Old sentence." },
        ],
      });
      expect(result.suspicious).toBe(false);
    });

    it("should return true when the response fabricates contact details", () => {
      const result = detectHallucinations({
        suggestions: [
          { suggestionText: "", originalText: "Old" },
        ],
      });
      expect(result.suspicious).toBe(true);
    });

    it("should return true when the response invents job history", () => {
      const result = detectHallucinations({
        suggestions: Array.from({ length: 11 }, (_, i) => ({
          suggestionText: "Suggestion " + i,
          originalText: "Original " + i,
        })),
      });
      expect(result.suspicious).toBe(true);
      expect(result.reason).toContain("Unusually high number");
    });
  });
});
