import { describe, it, expect } from "vitest";
import { createTextHash } from "../../utils/hashUtils";

describe("hashUtils", () => {
  describe("createTextHash", () => {
    it("should produce a consistent hash for the same text", () => {
      const hash1 = createTextHash("hello world");
      const hash2 = createTextHash("hello world");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different text", () => {
      const hash1 = createTextHash("hello world");
      const hash2 = createTextHash("goodbye world");
      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty strings", () => {
      const hash = createTextHash("");
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });
  });
});
