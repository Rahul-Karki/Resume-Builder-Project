import { describe, it, expect, vi } from "vitest";
import { correlationIdMiddleware } from "../middleware/correlationId";

describe("correlationIdMiddleware", () => {
  it("should generate a correlation ID when none is provided", () => {
    const req = { header: vi.fn().mockReturnValue(undefined) } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    correlationIdMiddleware(req, res, next);

    expect(req.traceId).toBeDefined();
    expect(req.correlationId).toBe(req.traceId);
    expect(next).toHaveBeenCalled();
  });

  it("should propagate a W3C traceparent header", () => {
    const traceparent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const req = { header: vi.fn((h) => h === "traceparent" ? traceparent : undefined) } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    correlationIdMiddleware(req, res, next);

    expect(req.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(next).toHaveBeenCalled();
  });

  it("should set x-correlation-id and x-trace-id on the response", () => {
    const req = { header: vi.fn().mockReturnValue(undefined) } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    correlationIdMiddleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-Correlation-ID", expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith("X-Trace-ID", expect.any(String));
  });

  it("should use an existing x-correlation-id header when present", () => {
    const req = { header: vi.fn((h) => h === "x-correlation-id" ? "existing-trace" : undefined) } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    correlationIdMiddleware(req, res, next);

    expect(req.traceId).toBe("existing-trace");
  });
});
