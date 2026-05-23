import { describe, it, expect } from "vitest";
import { sanitizePlainText } from "../../utils/sanitize";

describe("sanitize", () => {
  describe("sanitizeText", () => {
    it("should remove HTML tags from text", () => {
      const result = sanitizePlainText("<p>Hello</p>") as string;
      expect(result).toBe("Hello");
    });

    it("should preserve safe characters", () => {
      const result = sanitizePlainText("Hello, World! 123") as string;
      expect(result).toBe("Hello, World! 123");
    });

    it("should handle empty strings", () => {
      const result = sanitizePlainText("") as string;
      expect(result).toBe("");
    });
  });

  describe("stripScriptTags", () => {
    it("should remove script tags and their content", () => {
      const result = sanitizePlainText("Hello<script>alert('xss')</script>World") as string;
      expect(result).toBe("HelloWorld");
    });
  });
});
