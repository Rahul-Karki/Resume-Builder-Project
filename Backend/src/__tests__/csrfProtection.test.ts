// ─── Module: csrfProtection ───────────────────────────
import { describe, it, expect, vi } from "vitest";

vi.mock("../utils/securityLogger", () => ({
  logCsrfFailure: vi.fn(),
}));

import { csrfProtection } from "../middleware/csrfProtection";

function createRes() {
  return {
    statusCode: null as number | null,
    jsonBody: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.jsonBody = body;
      return this;
    },
  };
}

function createReq(overrides: Record<string, any> = {}) {
  const headers = overrides.headers ?? {};

  return {
    method: overrides.method ?? "GET",
    path: overrides.path ?? "/api/test",
    headers,
    header(name: string) {
      return headers[name.toLowerCase()] ?? headers[name] ?? "";
    },
  };
}

describe("csrfProtection", () => {
  it("allows safe methods without a token", () => {
    const req = createReq({ method: "GET" }) as any;
    const res = createRes() as any;
    let nextCalled = false;

    csrfProtection(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(null);
  });

  it("exempts the refresh route", () => {
    const req = createReq({ method: "POST", path: "/api/refresh" }) as any;
    const res = createRes() as any;
    let nextCalled = false;

    csrfProtection(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(null);
  });

  it("blocks unsafe requests with missing or mismatched tokens", () => {
    const req = createReq({
      method: "POST",
      headers: {
        cookie: "csrfToken=csrf-cookie-token",
        "x-csrf-token": "csrf-header-token",
      },
    }) as any;
    const res = createRes() as any;
    let nextCalled = false;

    csrfProtection(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.jsonBody.message).toBe("CSRF validation failed");
    expect(res.jsonBody.code).toBe("CSRF_VALIDATION_FAILED");
    expect(typeof res.jsonBody.traceId).toBe("string");
  });

  it("allows matching CSRF tokens", () => {
    const req = createReq({
      method: "POST",
      headers: {
        cookie: "csrfToken=csrf-token",
        "x-csrf-token": "csrf-token",
      },
    }) as any;
    const res = createRes() as any;
    let nextCalled = false;

    csrfProtection(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(null);
  });
});
