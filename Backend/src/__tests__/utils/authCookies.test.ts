// ─── Module: authCookies ───────────────────────────
// Description: Set and clear authentication cookies
// Coverage targets: setAccessTokenCookie, setAuthCookies, setCsrfCookie, clearAuthCookies
// Last updated: 2026-05-22

import { describe, it, expect } from "vitest";
import {
  clearAuthCookies,
  setAccessTokenCookie,
  setAuthCookies,
  setCsrfCookie,
} from "../../utils/authCookies";

const createReq = (overrides: Record<string, unknown> = {}) => ({
  secure: false,
  headers: {} as Record<string, string>,
  ...overrides,
});

const createRes = () => {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const cleared: Array<{ name: string; options: Record<string, unknown> }> = [];

  return {
    cookies,
    cleared,
    cookie(name: string, value: string, options: Record<string, unknown>) {
      cookies.push({ name, value, options });
    },
    clearCookie(name: string, options: Record<string, unknown>) {
      cleared.push({ name, options });
    },
  };
};

describe("authCookies", () => {
  describe("setAccessTokenCookie", () => {
    it("should set expected auth cookie attributes", () => {
      const req = createReq();
      const res = createRes();

      setAccessTokenCookie(req as any, res as any, "access-123");

      expect(res.cookies.length).toBe(1);
      expect(res.cookies[0].name).toBe("accessToken");
      expect(res.cookies[0].value).toBe("access-123");
      expect(res.cookies[0].options.httpOnly).toBe(true);
      expect(res.cookies[0].options.path).toBe("/");
      expect(res.cookies[0].options.maxAge).toBe(15 * 60 * 1000);
      expect(res.cookies[0].options.sameSite).toBe("lax");
      expect(res.cookies[0].options.secure).toBe(false);
    });
  });

  describe("setCsrfCookie", () => {
    it("should return token and set client-readable cookie", () => {
      const req = createReq();
      const res = createRes();

      const csrfToken = setCsrfCookie(req as any, res as any);

      expect(csrfToken).toMatch(/^[a-f0-9]{64}$/);
      expect(res.cookies.length).toBe(1);
      expect(res.cookies[0].name).toBe("csrfToken");
      expect(res.cookies[0].value).toBe(csrfToken);
      expect(res.cookies[0].options.httpOnly).toBe(false);
    });
  });

  describe("setAuthCookies", () => {
    it("should set access, refresh, and csrf cookies", () => {
      const req = createReq();
      const res = createRes();

      const csrfToken = setAuthCookies(req as any, res as any, "access-token", "refresh-token");

      expect(csrfToken).toMatch(/^[a-f0-9]{64}$/);
      expect(res.cookies.length).toBe(3);
      expect(res.cookies.map((c) => c.name)).toEqual(["accessToken", "refreshToken", "csrfToken"]);
    });
  });

  describe("clearAuthCookies", () => {
    it("should clear auth and csrf cookies", () => {
      const req = createReq();
      const res = createRes();

      clearAuthCookies(req as any, res as any);

      expect(res.cleared.length).toBe(3);
      expect(res.cleared.map((c) => c.name)).toEqual(["accessToken", "refreshToken", "csrfToken"]);
    });
  });
});
