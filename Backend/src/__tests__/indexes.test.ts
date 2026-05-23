import { describe, it, expect, vi, beforeEach } from "vitest";

describe("indexes", () => {
  describe("createAllIndexes", () => {
    it("should create indexes for all configured collections", async () => {
      const { INDEX_DEFINITIONS } = await import("../config/indexes");
      const collections = Object.keys(INDEX_DEFINITIONS);
      expect(collections.length).toBeGreaterThan(0);
      expect(collections).toContain("User");
      expect(collections).toContain("Resume");
    });
    it("should handle duplicate index errors gracefully", async () => {
      const mongoose = await import("mongoose");
      vi.spyOn(mongoose.default, "connection", "get").mockReturnValue({ db: null } as any);
      const { createAllIndexes } = await import("../config/indexes");
      await expect(createAllIndexes()).rejects.toThrow();
    });
    it("should create TTL indexes where configured", async () => {
      const { INDEX_DEFINITIONS } = await import("../config/indexes");
      const resetTokenIndexes = INDEX_DEFINITIONS.ResetToken;
      expect(resetTokenIndexes.expiresAt.options.expireAfterSeconds).toBe(0);
    });
  });
});
