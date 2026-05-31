// ─── Module: refreshController ───────────────────────────
import { describe, it, expect, vi } from "vitest";

vi.mock("../utils/generateToken", () => ({
  generateAccessToken: vi.fn(() => "new-access-token"),
  generateRefreshToken: vi.fn(() => "unused-refresh-token"),
}));
vi.mock("../utils/cookieParser", () => ({ parseCookies: vi.fn(() => ({ refreshToken: "refresh-token" })) }));
vi.mock("../utils/authCookies", () => ({
  setAccessTokenCookie: vi.fn(),
  setCsrfCookie: vi.fn(() => "csrf-token"),
  setAuthCookies: vi.fn((_req: any, _res: any, _accessToken: string, _refreshToken: string) => "csrf-token"),
}));
vi.mock("../config/env", () => ({ env: { JWT_REFRESH_SECRET: "refresh-secret" } }));
vi.mock("../observability", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock("../utils/controllerObservability", () => ({
  startControllerSpan: vi.fn(() => ({
    setAttribute: vi.fn(),
    recordException: vi.fn(),
    setStatus: vi.fn(),
    end: vi.fn(),
  })),
  markSpanSuccess: vi.fn(),
  markSpanError: vi.fn(),
  finishControllerSpan: vi.fn(),
}));
vi.mock("../utils/tokenBlacklist", () => ({
  isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  blacklistRefreshToken: vi.fn().mockResolvedValue(undefined),
  blacklistAccessToken: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../models/User", () => ({
  default: {
    findById: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ tokenVersion: 0 }),
      }),
    }),
  },
}));

vi.mock("../utils/errorResponse", () => ({
  sendErrorResponse: (_res: any, _error: any, fallback: any = {}) => {
    const message = fallback.message ?? (_error instanceof Error ? _error.message : "Server error");
    return _res.status(fallback.statusCode ?? 500).json({
      message,
      code: fallback.code ?? "SERVER_ERROR",
      traceId: "test-trace-id",
    });
  },
}));
vi.mock("jsonwebtoken", () => ({ default: { verify: vi.fn(() => ({ userId: "user-123" })) } }));

import { refreshAccessToken, issueCsrfToken } from "../controllers/refreshController";
import { generateAccessToken } from "../utils/generateToken";
import { parseCookies } from "../utils/cookieParser";
import { setAccessTokenCookie, setCsrfCookie, setAuthCookies } from "../utils/authCookies";
import jwt from "jsonwebtoken";

function createRes() {
  return {
    statusCode: null as number | null,
    jsonBody: null as any,
    sendStatusCode: null as number | null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.jsonBody = body;
      return this;
    },
    sendStatus(code: number) {
      this.sendStatusCode = code;
      return this;
    },
  };
}

describe("refreshController", () => {
  it("refreshAccessToken returns 401 when refresh token cookie is missing", () => {
    vi.mocked(parseCookies).mockReturnValueOnce({});

    const req = { headers: {}, originalUrl: "/api/refresh" } as any;
    const res = createRes() as any;

    refreshAccessToken(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.jsonBody.message).toBe("Authentication required");
    expect(res.jsonBody.code).toBe("AUTH_REQUIRED");
    expect(typeof res.jsonBody.traceId).toBe("string");
    expect(vi.mocked(jwt.verify)).not.toHaveBeenCalled();
    expect(vi.mocked(generateAccessToken)).not.toHaveBeenCalled();
    expect(vi.mocked(setAccessTokenCookie)).not.toHaveBeenCalled();
    expect(vi.mocked(setCsrfCookie)).not.toHaveBeenCalled();
  });

  it("refreshAccessToken refreshes access cookie and returns csrf token for a valid refresh token", async () => {
    const req = {
      headers: { cookie: "refreshToken=refresh-token" },
      originalUrl: "/api/refresh",
    } as any;
    const res = createRes() as any;

    await refreshAccessToken(req, res);

    expect(res.jsonBody?.message).toBe("Token refreshed");
    expect(res.jsonBody?.csrfToken).toBe("csrf-token");
    expect(res.sendStatusCode).toBe(null);
    expect(vi.mocked(setAuthCookies)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(setAuthCookies)).toHaveBeenCalledWith(
      req,
      res,
      "new-access-token",
      expect.any(String),
    );
  });

  it("refreshAccessToken returns 403 when refresh token verification fails", async () => {
    vi.mocked(jwt.verify).mockImplementationOnce(() => { throw new Error("invalid refresh token"); });

    const req = {
      headers: { cookie: "refreshToken=refresh-token" },
      originalUrl: "/api/refresh",
    } as any;
    const res = createRes() as any;

    await refreshAccessToken(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.jsonBody.message).toBe("Invalid refresh token");
    expect(res.jsonBody.code).toBe("AUTH_REQUIRED");
    expect(typeof res.jsonBody.traceId).toBe("string");
  });

  it("issueCsrfToken issues a csrf token and cookie", () => {
    const req = { headers: {}, originalUrl: "/api/csrf" } as any;
    const res = createRes() as any;

    issueCsrfToken(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({
      message: "CSRF token issued",
      csrfToken: "csrf-token",
    });
    expect(vi.mocked(setCsrfCookie)).toHaveBeenCalledTimes(1);
  });
});
