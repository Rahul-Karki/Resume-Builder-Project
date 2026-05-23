import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticate, requireAdmin, requireSuperAdmin } from "../middleware/adminAuthMiddleware";
import jwt from "jsonwebtoken";
import User from "../models/User";

vi.mock("jsonwebtoken");
vi.mock("../models/User");
vi.mock("../utils/cookieParser", () => ({ parseCookies: vi.fn((c) => c ? { accessToken: c } : {}) }));
vi.mock("../errors/AppError");

describe("adminAuthMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authenticate", () => {
    it("should call next() when a valid access token is provided", async () => {
      vi.mocked(jwt.verify).mockReturnValue({ userId: "u1", role: "admin" } as any);
      vi.mocked(User.findById).mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "u1", name: "Admin", role: "admin", email: "admin@test.com" }) }) } as any);

      const req = { headers: { cookie: "valid-token" } } as any;
      const res = {} as any;
      const next = vi.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should return 401 when no token is provided", async () => {
      const req = { headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 when the token is expired", async () => {
      vi.mocked(jwt.verify).mockImplementation(() => { throw new Error("jwt expired"); });

      const req = { headers: { cookie: "expired-token" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("requireAdmin", () => {
    it("should call next() when the user has an admin role", () => {
      const req = { user: { id: "u1", role: "admin" } } as any;
      const res = {} as any;
      const next = vi.fn();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should return 403 when the user has a user role", () => {
      const req = { user: { id: "u1", role: "user" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      requireAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 when req.user is not set", () => {
      const req = {} as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      requireAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("requireSuperAdmin", () => {
    it("should call next() when the user has a superadmin role", () => {
      const req = { user: { id: "u1", role: "superadmin" } } as any;
      const res = {} as any;
      const next = vi.fn();

      requireSuperAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should return 403 when the user has an admin role", () => {
      const req = { user: { id: "u1", role: "admin" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      requireSuperAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });
  });
});
