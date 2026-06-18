import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../observability");
import { logger as mockLogger } from "../../observability";

beforeEach(() => { vi.clearAllMocks(); });

const createReq = (overrides: Record<string, unknown> = {}) => ({
  ip: "127.0.0.1",
  method: "GET",
  path: "/test",
  headers: {},
  get: vi.fn((name: string) => (name === "user-agent" ? "test-agent" : undefined)),
  user: { id: "user-1" },
  correlationId: "corr-123",
  ...overrides,
});

describe("securityLogger", () => {
  describe("logAuthFailure", () => {
    it("should log an auth failure with reason and IP", async () => {
      const { logAuthFailure } = await import("../../utils/securityLogger");
      logAuthFailure(createReq() as any, "Invalid token");
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.error.mock.calls[0][0].ip).toBe("127.0.0.1");
    });
  });

  describe("logLoginAttempt", () => {
    it("should log login attempts with success or failure", async () => {
      const { logLoginAttempt } = await import("../../utils/securityLogger");
      logLoginAttempt(createReq() as any, "test@example.com", true);
      expect(mockLogger.warn).toHaveBeenCalled();

      vi.clearAllMocks();
      logLoginAttempt(createReq() as any, "test@example.com", false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("logSuspiciousActivity", () => {
    it("should log suspicious activity with details", async () => {
      const { logSuspiciousActivity } = await import("../../utils/securityLogger");
      logSuspiciousActivity(createReq() as any, "Multiple failed logins", { count: 5 });
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.error.mock.calls[0][0].activity).toBe("Multiple failed logins");
    });
  });

  describe("logAdminAction", () => {
    it("should log admin actions with the admin user ID", async () => {
      const { logAdminAction } = await import("../../utils/securityLogger");
      logAdminAction(createReq() as any, "delete-user", { targetUserId: "user-2" });
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.warn.mock.calls[0][0].userId).toBe("user-1");
    });
  });

  describe("logCsrfFailure", () => {
    it("should log CSRF validation failures", async () => {
      const { logCsrfFailure } = await import("../../utils/securityLogger");
      logCsrfFailure(createReq() as any);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.error.mock.calls[0][0].event).toBe("CSRF_VALIDATION_FAILED");
    });
  });
});
