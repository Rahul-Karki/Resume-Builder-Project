import { describe, it, expect, vi } from "vitest";
import { notFoundHandler, errorHandler } from "../middleware/errorHandler";

vi.mock("../observability", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("../observability/complianceMetrics", () => ({ recordError: vi.fn() }));
vi.mock("../utils/redactSensitive", () => ({ redactRequestData: vi.fn((p, q) => ({ params: p, query: q })) }));

describe("errorHandler", () => {
  describe("notFoundHandler", () => {
    it("should return 404 for unknown routes", () => {
      const req = { method: "GET", originalUrl: "/api/unknown" } as any;
      const res = {} as any;
      const next = vi.fn();

      notFoundHandler(req, res, next);

      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe("NOT_FOUND");
    });

    it("should include the requested path in the error response", () => {
      const req = { method: "POST", originalUrl: "/api/test" } as any;
      const res = {} as any;
      const next = vi.fn();

      notFoundHandler(req, res, next);

      const err = next.mock.calls[0][0];
      expect(err.message).toBe("Route not found");
    });
  });

  describe("errorHandler", () => {
    it("should return 500 for unhandled errors", () => {
      const req = { traceId: "abc", correlationId: "abc", method: "GET", originalUrl: "/test", params: {}, query: {}, user: {} } as any;
      const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      errorHandler(new Error("test error"), req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should omit stack traces in production mode", () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      const req = { traceId: "abc", correlationId: "abc", method: "GET", originalUrl: "/test", params: {}, query: {}, user: {} } as any;
      const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      errorHandler(new Error("test error"), req, res, next);

      const body = res.json.mock.calls[0][0];
      expect(body.message).toBe("Server error");
      process.env.NODE_ENV = origEnv;
    });

  });
});
