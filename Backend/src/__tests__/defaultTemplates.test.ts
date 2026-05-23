import { describe, it, expect, vi, beforeEach } from "vitest";

describe("defaultTemplates", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("ensureDefaultTemplatesInBackend", () => {
    it("should insert default templates when the collection is empty", async () => {
      vi.doMock("../models/Template", () => ({
        default: { updateOne: vi.fn().mockResolvedValue({ upsertedCount: 1, modifiedCount: 0 }) },
      }));
      vi.doMock("../models/User", () => ({
        default: { findOne: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "admin123", role: "admin" }) }) }) },
      }));
      vi.doMock("../enums/userRole", () => ({ UserRole: { ADMIN: "admin", SUPERADMIN: "superadmin" } }));
      vi.doMock("../middleware/redisCache", () => ({ invalidateRedisCache: vi.fn(), redisCacheScopes: {} }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
      const { ensureDefaultTemplatesInBackend } = await import("../bootstrap/defaultTemplates");
      await expect(ensureDefaultTemplatesInBackend()).resolves.toBeUndefined();
    });
    it("should skip insertion when templates already exist", async () => {
      vi.doMock("../models/Template", () => ({
        default: { updateOne: vi.fn().mockResolvedValue({ upsertedCount: 0, modifiedCount: 0 }) },
      }));
      vi.doMock("../models/User", () => ({
        default: { findOne: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "admin123", role: "admin" }) }) }) },
      }));
      vi.doMock("../enums/userRole", () => ({ UserRole: { ADMIN: "admin", SUPERADMIN: "superadmin" } }));
      vi.doMock("../middleware/redisCache", () => ({ invalidateRedisCache: vi.fn(), redisCacheScopes: {} }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
      const { ensureDefaultTemplatesInBackend } = await import("../bootstrap/defaultTemplates");
      await expect(ensureDefaultTemplatesInBackend()).resolves.toBeUndefined();
    });
    it("should not error when a concurrent insert happens", async () => {
      vi.doMock("../models/Template", () => ({
        default: { updateOne: vi.fn().mockRejectedValue(new Error("Duplicate key")) },
      }));
      vi.doMock("../models/User", () => ({
        default: { findOne: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "admin123", role: "admin" }) }) }) },
      }));
      vi.doMock("../enums/userRole", () => ({ UserRole: { ADMIN: "admin", SUPERADMIN: "superadmin" } }));
      vi.doMock("../middleware/redisCache", () => ({ invalidateRedisCache: vi.fn(), redisCacheScopes: {} }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
      const { ensureDefaultTemplatesInBackend } = await import("../bootstrap/defaultTemplates");
      await expect(ensureDefaultTemplatesInBackend()).rejects.toThrow();
    });
  });
});
