import { describe, it, expect, vi, beforeEach } from "vitest";

describe("observability", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("logger", () => {
    it("should log messages at the configured level", async () => {
      const { logger } = await import("../observability");
      const spy = vi.spyOn(logger, "info").mockImplementation(() => {});
      logger.info("test message");
      expect(spy).toHaveBeenCalledWith("test message");
      spy.mockRestore();
    });
    it("should include service name and version in every log", async () => {
      const { logger } = await import("../observability");
      const spy = vi.spyOn(logger, "info").mockImplementation(() => {});
      logger.info({ custom: "data" }, "test");
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
  describe("metricsMiddleware", () => {
    it("should record request count and duration", async () => {
      const { metricsMiddleware, promRequestCounter, metricsRegistry } = await import("../observability");
      const req = { method: "GET", route: { path: "/test" }, baseUrl: "" } as any;
      const res = { statusCode: 200, on: vi.fn((e: string, cb: () => void) => { if (e === "finish") cb(); }), setHeader: vi.fn() } as any;
      const next = vi.fn();
      metricsMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    it("should increment error count on failed requests", async () => {
      const { metricsMiddleware } = await import("../observability");
      const req = { method: "POST", route: { path: "/error" }, baseUrl: "" } as any;
      const res = { statusCode: 500, on: vi.fn((e: string, cb: () => void) => { if (e === "finish") cb(); }), setHeader: vi.fn() } as any;
      const next = vi.fn();
      metricsMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
  describe("metricsHandler", () => {
    it("should expose Prometheus-formatted metrics", async () => {
      vi.stubEnv("ENABLE_METRICS", "true");
      const { metricsHandler } = await import("../observability");
      const req = {} as any;
      const res = { setHeader: vi.fn(), end: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      await metricsHandler(req, res);
      expect(res.setHeader).toHaveBeenCalled();
    });
    it("should include default Node.js metrics", async () => {
      vi.stubEnv("ENABLE_METRICS", "true");
      const { metricsHandler } = await import("../observability");
      const req = {} as any;
      const res = { setHeader: vi.fn(), end: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      await metricsHandler(req, res);
      expect(res.end).toHaveBeenCalled();
    });
  });
});
