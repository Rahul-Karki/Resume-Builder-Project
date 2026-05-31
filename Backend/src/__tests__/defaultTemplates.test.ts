import { describe, it, expect, vi, beforeEach } from "vitest";

describe("defaultTemplates", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("ensureDefaultTemplatesInBackend", () => {
    it("should insert default templates when the collection is empty", async () => {
      vi.doMock("../models/Template", () => ({
        default: { countDocuments: vi.fn().mockResolvedValue(0), updateOne: vi.fn().mockResolvedValue({ upsertedCount: 1, modifiedCount: 0 }) },
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
        default: { countDocuments: vi.fn().mockResolvedValue(1), updateOne: vi.fn().mockResolvedValue({ upsertedCount: 0, modifiedCount: 0 }) },
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
        default: { countDocuments: vi.fn().mockResolvedValue(0), updateOne: vi.fn().mockRejectedValue(new Error("Duplicate key")) },
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

    it("should create a bootstrap admin when no users exist", async () => {
      const createMock = vi.fn().mockResolvedValue({ _id: "bootstrap-admin-id" });
      vi.doMock("../models/Template", () => ({
        default: { updateOne: vi.fn().mockResolvedValue({ upsertedCount: 1, modifiedCount: 0 }), countDocuments: vi.fn().mockResolvedValue(0) },
      }));
      vi.doMock("../models/User", () => ({
        default: {
          findOne: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) }),
          create: createMock,
        },
      }));
      vi.doMock("../enums/userRole", () => ({ UserRole: { ADMIN: "admin", SUPERADMIN: "superadmin" } }));
      vi.doMock("../middleware/redisCache", () => ({ invalidateRedisCache: vi.fn(), redisCacheScopes: {} }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

      const { ensureDefaultTemplatesInBackend } = await import("../bootstrap/defaultTemplates");
      await expect(ensureDefaultTemplatesInBackend()).resolves.toBeUndefined();
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
        email: "admin@local.seed",
        role: "admin",
        authProvider: ["google"],
        emailVerified: true,
      }));
    });

    it("should create a local bootstrap admin when credentials are provided", async () => {
      const createMock = vi.fn().mockResolvedValue({ _id: "bootstrap-admin-id" });
      const hashMock = vi.fn().mockResolvedValue("hashed-bootstrap-password");
      const originalEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
      const originalPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
      const originalName = process.env.BOOTSTRAP_ADMIN_NAME;

      process.env.BOOTSTRAP_ADMIN_EMAIL = "admin@example.com";
      process.env.BOOTSTRAP_ADMIN_PASSWORD = "StrongPass!123";
      process.env.BOOTSTRAP_ADMIN_NAME = "Dashboard Admin";

      vi.doMock("bcrypt", () => ({ default: { hash: hashMock } }));
      vi.doMock("../models/Template", () => ({
        default: { updateOne: vi.fn().mockResolvedValue({ upsertedCount: 1, modifiedCount: 0 }), countDocuments: vi.fn().mockResolvedValue(0) },
      }));
      vi.doMock("../models/User", () => ({
        default: {
          findOne: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) }),
          create: createMock,
        },
      }));
      vi.doMock("../enums/userRole", () => ({ UserRole: { ADMIN: "admin", SUPERADMIN: "superadmin" } }));
      vi.doMock("../middleware/redisCache", () => ({ invalidateRedisCache: vi.fn(), redisCacheScopes: {} }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

      const { ensureDefaultTemplatesInBackend } = await import("../bootstrap/defaultTemplates");
      await expect(ensureDefaultTemplatesInBackend()).resolves.toBeUndefined();
      expect(hashMock).toHaveBeenCalledWith("StrongPass!123", 10);
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
        email: "admin@example.com",
        name: "Dashboard Admin",
        role: "admin",
        authProvider: ["local"],
        emailVerified: true,
        password: "hashed-bootstrap-password",
      }));

      process.env.BOOTSTRAP_ADMIN_EMAIL = originalEmail;
      process.env.BOOTSTRAP_ADMIN_PASSWORD = originalPassword;
      process.env.BOOTSTRAP_ADMIN_NAME = originalName;
    });
  });
});
