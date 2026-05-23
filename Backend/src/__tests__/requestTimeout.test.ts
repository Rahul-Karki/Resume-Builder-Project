// ─── Module: requestTimeout ───────────────────────────
import { describe, it, expect, vi } from "vitest";

vi.mock("../observability", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock("../config/env", () => ({ env: {} }));

import { requestTimeoutMiddleware, resolveRequestTimeoutMs } from "../middleware/requestTimeout";

function createRes() {
  return {
    statusCode: null as number | null,
    body: null as any,
    headersSent: false,
    once() {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
}

describe("requestTimeoutMiddleware", () => {
  it("resolveRequestTimeoutMs extends PDF export routes", () => {
    const pdfReq = { baseUrl: "/api/resumes", path: "/123/export-pdf", originalUrl: "/api/resumes/123/export-pdf" };
    const downloadReq = { baseUrl: "/api/resumes", path: "/download-resume", originalUrl: "/api/resumes/download-resume" };
    const regularReq = { baseUrl: "/api/templates", path: "/", originalUrl: "/api/templates" };

    expect(resolveRequestTimeoutMs(pdfReq as any)).toBe(120000);
    expect(resolveRequestTimeoutMs(downloadReq as any)).toBe(120000);
    expect(resolveRequestTimeoutMs(regularReq as any)).toBe(30000);
  });

  it("sends a timeout response when the timer fires", () => {
    let capturedDelay: number | null = null;
    let capturedCallback: (() => void) | null = null;

    vi.spyOn(global, "setTimeout").mockImplementation(((callback: () => void, delay: number) => {
      capturedDelay = delay;
      capturedCallback = callback;
      return { mocked: true } as any;
    }) as any);

    const req = {
      baseUrl: "/api/resumes",
      path: "/123/export-pdf",
      originalUrl: "/api/resumes/123/export-pdf",
    } as any;
    const res = createRes() as any;
    let nextCalled = false;

    requestTimeoutMiddleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(capturedDelay).toBe(120000);
    expect(typeof capturedCallback).toBe("function");

    capturedCallback!();

    expect(res.statusCode).toBe(503);
    expect(res.body.message).toBe("Request timed out");
    expect(res.body.code).toBe("REQUEST_TIMEOUT");
    expect(typeof res.body.traceId).toBe("string");

    vi.restoreAllMocks();
  });
});
