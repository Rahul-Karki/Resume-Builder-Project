import { describe, it, expect, vi, beforeEach } from "vitest";

describe("sharedConnection", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("getSharedBullmqConnection", () => {
    it("should return a shared Redis connection singleton", async () => {
      vi.doMock("../../../shared/src/bullmq", () => ({
        createBullmqConnection: vi.fn().mockReturnValue({ host: "localhost", port: 6379 }),
        resolveBullmqRedisUrl: vi.fn().mockReturnValue("redis://localhost:6379"),
      }));
      vi.doMock("../config/env", () => ({ env: { BULLMQ_REDIS_URL: "", REDIS_URL: "redis://localhost:6379", REDIS_CONNECT_TIMEOUT_MS: 5000, SERVICE_NAME: "test" } }));
      const { getSharedBullmqConnection } = await import("../queue/sharedConnection");
      const conn1 = getSharedBullmqConnection();
      const conn2 = getSharedBullmqConnection();
      expect(conn1).toBe(conn2);
    });
  });

  describe("resolveBullmqRedisUrl", () => {
    it("should resolve the Redis URL from environment variables", async () => {
      const bullmq = await vi.importActual("../../../shared/src/bullmq") as typeof import("../../../shared/src/bullmq");
      const url = bullmq.resolveBullmqRedisUrl("redis://cache:6379", "");
      expect(url).toBe("redis://cache:6379");
    });
    it("should throw when no Redis URL is configured", async () => {
      const bullmq = await vi.importActual("../../../shared/src/bullmq") as typeof import("../../../shared/src/bullmq");
      expect(() => bullmq.resolveBullmqRedisUrl("", "")).toThrow();
    });
  });
});
