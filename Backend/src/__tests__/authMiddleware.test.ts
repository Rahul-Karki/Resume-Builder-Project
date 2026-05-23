// ─── Module: authMiddleware ───────────────────────────
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../utils/cookieParser", () => ({ parseCookies: vi.fn() }));
vi.mock("../models/User", () => ({ default: { findById: vi.fn() } }));
vi.mock("jsonwebtoken", () => ({ default: { verify: vi.fn() } }));

import { authMiddleware } from "../middleware/authMiddleware";
import { parseCookies } from "../utils/cookieParser";
import User from "../models/User";
import jwt from "jsonwebtoken";

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

beforeEach(() => {
  vi.mocked(parseCookies).mockReset().mockReturnValue({ accessToken: "access-token" });
  vi.mocked(jwt.verify).mockReset().mockReturnValue({ userId: "user-123" } as any);
  vi.mocked(User.findById).mockReset().mockReturnValue({
    select() {
      return {
        lean() {
          return Promise.resolve({
            _id: "user-123",
            role: "admin",
            name: "Rahul",
          });
        },
      };
    },
  } as any);
});

describe("authMiddleware", () => {
  it("returns 401 when no access token cookie is present", () => {
    vi.mocked(parseCookies).mockReturnValueOnce({});

    const req = { headers: {} } as any;
    const res = createRes() as any;
    let nextCalled = false;

    authMiddleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.jsonBody.message).toBe("Unauthorized: No token provided");
    expect(res.jsonBody.code).toBe("AUTH_REQUIRED");
    expect(typeof res.jsonBody.traceId).toBe("string");
  });

  it("attaches the current user when the token is valid", async () => {
    const req = {
      headers: {
        cookie: "accessToken=access-token",
      },
    } as any;
    const res = createRes() as any;
    let nextCalled = false;

    authMiddleware(req, res, () => {
      nextCalled = true;
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(null);
    expect(req.user).toEqual({
      id: "user-123",
      role: "admin",
      name: "Rahul",
      email: undefined,
    });
  });

  it("returns 401 when the user cannot be found", async () => {
    vi.mocked(User.findById).mockReset().mockReturnValueOnce({
      select() {
        return {
          lean() {
            return Promise.resolve(null);
          },
        };
      },
    } as any);

    const req = {
      headers: {
        cookie: "accessToken=access-token",
      },
    } as any;
    const res = createRes() as any;
    let nextCalled = false;

    authMiddleware(req, res, () => {
      nextCalled = true;
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.jsonBody.message).toBe("Unauthorized: User not found");
    expect(res.jsonBody.code).toBe("AUTH_REQUIRED");
    expect(typeof res.jsonBody.traceId).toBe("string");
  });

  it("returns 401 when token verification fails", () => {
    vi.mocked(jwt.verify).mockReset().mockImplementationOnce(() => {
      throw new Error("invalid token");
    });

    const req = {
      headers: {
        cookie: "accessToken=access-token",
      },
    } as any;
    const res = createRes() as any;
    let nextCalled = false;

    authMiddleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.jsonBody.message).toBe("Unauthorized: Invalid token");
    expect(res.jsonBody.code).toBe("AUTH_REQUIRED");
    expect(typeof res.jsonBody.traceId).toBe("string");
  });
});
