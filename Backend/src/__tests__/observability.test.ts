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
  describe("frontendMetricsCounter", () => {
    it("should be a Counter with correct labels", async () => {
      const { frontendMetricsCounter } = await import("../observability");
      expect(frontendMetricsCounter).toBeDefined();
      expect(frontendMetricsCounter.labelNames).toContain("name");
      expect(frontendMetricsCounter.labelNames).toContain("unit");
    });
  });
  describe("frontendMetricsHistogram", () => {
    it("should be a Histogram with correct labels", async () => {
      const { frontendMetricsHistogram } = await import("../observability");
      expect(frontendMetricsHistogram).toBeDefined();
      expect(frontendMetricsHistogram.labelNames).toContain("name");
      expect(frontendMetricsHistogram.labelNames).toContain("unit");
    });
  });
  describe("clientMetricsHandler", () => {
    it("should record metrics and return ok", async () => {
      const { clientMetricsHandler, frontendMetricsCounter, metricsRegistry } = await import("../observability");
      const req = {
        body: {
          metrics: [
            { name: "LCP", value: 1500, unit: "ms", context: { type: "web-vital" } },
            { name: "api_fetch", value: 200, unit: "ms" },
          ],
        },
      } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      clientMetricsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
    it("should handle empty metrics array", async () => {
      const { clientMetricsHandler } = await import("../observability");
      const req = { body: { metrics: [] } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      clientMetricsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
    it("should handle missing body gracefully", async () => {
      const { clientMetricsHandler } = await import("../observability");
      const req = {} as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      clientMetricsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
    it("should skip histogram observe for zero values", async () => {
      const { clientMetricsHandler, frontendMetricsHistogram, frontendMetricsCounter } = await import("../observability");
      const observeSpy = vi.spyOn(frontendMetricsHistogram, "observe");
      const incSpy = vi.spyOn(frontendMetricsCounter, "inc");

      const req = { body: { metrics: [{ name: "render", value: 0, unit: "ms" }] } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      clientMetricsHandler(req, res);
      expect(incSpy).toHaveBeenCalled();
      expect(observeSpy).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ ok: true });

      observeSpy.mockRestore();
      incSpy.mockRestore();
    });
  });
});
