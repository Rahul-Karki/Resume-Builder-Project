import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
  withScope: vi.fn(),
  captureException: vi.fn(),
}));

describe("sentry", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("initializeBackendSentry", () => {
    it("should not initialize when NODE_ENV is test", async () => {
      const sentry = await import("@sentry/node");
      const { initializeBackendSentry } = await import("../config/sentry");
      const result = initializeBackendSentry();
      expect(result).toBe(false);
      expect(sentry.init).not.toHaveBeenCalled();
    });

    it("should not initialize when DSN is empty in production", async () => {
      const sentry = await import("@sentry/node");
      const { initializeBackendSentry } = await import("../config/sentry");
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("SENTRY_DSN", undefined);
      const result = initializeBackendSentry();
      expect(result).toBe(false);
      expect(sentry.init).not.toHaveBeenCalled();
    });
  });

  describe("flushBackendSentry", () => {
    it("should not flush when not initialized", async () => {
      const sentry = await import("@sentry/node");
      const { flushBackendSentry } = await import("../config/sentry");
      const result = await flushBackendSentry(1000);
      expect(result).toBe(false);
    });
  });
});
