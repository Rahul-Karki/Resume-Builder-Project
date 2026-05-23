import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestSizeLimitMiddleware } from "../middleware/requestSizeLimit";

vi.mock("../config/env", () => ({ env: { REQUEST_BODY_LIMIT: "10kb" } }));

describe("requestSizeLimitMiddleware", () => {
  it("should allow requests within the configured size limit", () => {
    const req = { headers: { "content-length": "5000" } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    requestSizeLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should return 413 when Content-Length exceeds the limit", () => {
    const req = { headers: { "content-length": "50000" } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    requestSizeLimitMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow requests without a Content-Length header", () => {
    const req = { headers: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    requestSizeLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
