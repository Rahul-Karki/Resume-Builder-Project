import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../models/User", () => {
  const mockUser = function (this: any, data?: any) {
    if (data) Object.assign(this, data);
    this._id = this._id || "user1";
    this.name = this.name || "Test User";
    this.email = this.email || "test@test.com";
    this.password = this.password || "hashed-password";
    this.role = this.role || "user";
    this.authProvider = this.authProvider || ["local"];
    this.loginAttempts = this.loginAttempts ?? 0;
    this.lockUntil = this.lockUntil ?? null;
    this.save = vi.fn().mockResolvedValue(true);
  };
  return {
    default: Object.assign(mockUser, {
      findOne: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      findOneAndUpdate: vi.fn(),
      deleteMany: vi.fn(),
    }),
  };
});
vi.mock("../models/ResetToken", () => ({
  default: Object.assign(vi.fn(), { findOne: vi.fn(), deleteMany: vi.fn(), create: vi.fn(), countDocuments: vi.fn() }),
}));
vi.mock("bcrypt");
vi.mock("../utils/generateToken", () => ({ generateAccessToken: vi.fn(() => "access"), generateRefreshToken: vi.fn(() => "refresh") }));
vi.mock("../utils/hashToken", () => ({ default: vi.fn((t) => "hashed-" + t) }));
vi.mock("../utils/sendEmail", () => ({ sendEmail: vi.fn(), sendVerificationEmail: vi.fn() }));
vi.mock("../utils/google", () => ({ verifyGoogleToken: vi.fn() }));
vi.mock("../utils/authCookies", () => ({ setAuthCookies: vi.fn(() => "csrf-token"), clearAuthCookies: vi.fn() }));
vi.mock("../utils/tokenBlacklist", () => ({ blacklistRefreshToken: vi.fn(), blacklistAccessToken: vi.fn() }));
vi.mock("../utils/cookieParser", () => ({ parseCookies: vi.fn(() => ({})) }));
vi.mock("../utils/errorResponse", () => ({ sendErrorResponse: vi.fn((res: any, err: any) => res.status(err?.statusCode ?? 500).json({ message: err?.message ?? "Error" })) }));
vi.mock("../utils/apiResponse", () => ({
  sendSuccess: vi.fn((res: any, d: any) => res.status(200).json(d)),
  sendCreated: vi.fn((res: any, d: any) => res.status(201).json(d)),
  sendBadRequest: vi.fn((res: any, m: string) => res.status(400).json({ message: m })),
  sendUnauthorized: vi.fn((res: any, m: string) => res.status(401).json({ message: m })),
  sendServerError: vi.fn((res: any) => res.status(500).json({ message: "Server Error" })),
}));
vi.mock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock("../utils/controllerObservability", () => ({ startControllerSpan: vi.fn(() => ({})), markSpanSuccess: vi.fn(), markSpanError: vi.fn(), finishControllerSpan: vi.fn() }));
vi.mock("../utils/securityLogger", () => ({ logLoginAttempt: vi.fn(), logLogout: vi.fn(), logSuspiciousActivity: vi.fn() }));
vi.mock("../utils/businessMetrics", () => ({ recordUserSignup: vi.fn(), recordLogin: vi.fn(), recordLoginFailure: vi.fn(), recordSuspiciousActivity: vi.fn() }));
vi.mock("../errors/AppError", () => {
  class MockAppError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, options: any = {}) {
      super(message);
      this.name = "AppError";
      this.statusCode = options.statusCode ?? 500;
      this.code = options.code ?? "SERVER_ERROR";
    }
  }
  class MockValidationError extends MockAppError {
    constructor(message = "Invalid request payload", details?: unknown) {
      super(message, { statusCode: 400, code: "VALIDATION_ERROR" });
      this.name = "ValidationError";
    }
  }
  class MockAuthError extends MockAppError {
    constructor(message = "Authentication required", options: any = {}) {
      super(message, { statusCode: options.statusCode ?? 401, code: options.code ?? "AUTH_REQUIRED" });
      this.name = "AuthError";
    }
  }
  class MockNotFoundError extends MockAppError {
    constructor(message = "Resource not found") {
      super(message, { statusCode: 404, code: "NOT_FOUND" });
      this.name = "NotFoundError";
    }
  }
  return { AppError: MockAppError, ValidationError: MockValidationError, AuthError: MockAuthError, NotFoundError: MockNotFoundError };
});

import { registerUser, login, forgotPassword, resetPassword, googleLogin, getCurrentUser, logout } from "../controllers/authController";
import User from "../models/User";
import ResetToken from "../models/ResetToken";
import bcrypt from "bcrypt";
import { verifyGoogleToken } from "../utils/google";
import { parseCookies } from "../utils/cookieParser";

const buildUser = (overrides = {}) => ({
  _id: "user1",
  name: "Test User",
  email: "test@test.com",
  password: "hashed-password",
  role: "user",
  authProvider: ["local"],
  loginAttempts: 0,
  lockUntil: null,
  save: vi.fn().mockResolvedValue(true),
  ...overrides,
});

describe("authController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should create a new user and return 201 when valid data is provided", async () => {
      vi.mocked(User.findOne).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed-password" as never);

      const req = { body: { name: "Test", email: "test@test.com", password: "Pass1234" }, originalUrl: "/api/register", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should return 400 when email already exists", async () => {
      vi.mocked(User.findOne).mockResolvedValue(buildUser() as any);

      const req = { body: { name: "Test", email: "test@test.com", password: "pass123" }, originalUrl: "/api/register", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 when required fields are missing", async () => {
      const req = { body: { name: "" }, originalUrl: "/api/register", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("login", () => {
    it("should return 200 when credentials are valid", async () => {
      const user = buildUser({ password: "hashed-pw" });
      vi.mocked(User.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue(user) } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const req = { body: { email: "test@test.com", password: "pass123" }, originalUrl: "/api/login", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 401 when password is incorrect", async () => {
      const user = buildUser({ password: "hashed-pw" });
      vi.mocked(User.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue(user) } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const req = { body: { email: "test@test.com", password: "wrong" }, originalUrl: "/api/login", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("forgotPassword", () => {
    it("should send a reset email when the email exists", async () => {
      vi.mocked(User.findOne).mockResolvedValue(buildUser() as any);
      vi.mocked(ResetToken.findOne).mockResolvedValue(null);

      const req = { body: { email: "test@test.com" }, originalUrl: "/api/forgot-password", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 200 even when the email does not exist (to prevent enumeration)", async () => {
      vi.mocked(User.findOne).mockResolvedValue(null);

      const req = { body: { email: "nonexistent@test.com" }, originalUrl: "/api/forgot-password", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("resetPassword", () => {
    it("should update the password when a valid token is provided", async () => {
      vi.mocked(ResetToken.findOne).mockResolvedValue({ userId: "user1", expiresAt: new Date(Date.now() + 60000) } as any);
      vi.mocked(User.findById).mockResolvedValue(buildUser() as any);
      vi.mocked(bcrypt.hash).mockResolvedValue("new-hashed" as never);
      vi.mocked(ResetToken.deleteMany).mockResolvedValue({ deletedCount: 1 } as any);

      const req = { body: { token: "valid-token", password: "Newpass1", confirmPassword: "Newpass1" }, originalUrl: "/api/reset-password", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 400 when the token has expired", async () => {
      vi.mocked(ResetToken.findOne).mockResolvedValue(null);

      const req = { body: { token: "expired", password: "newpass", confirmPassword: "newpass" }, originalUrl: "/api/reset-password", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("googleLogin", () => {
    it("should create a new user and return auth cookies when Google token is valid", async () => {
      vi.mocked(verifyGoogleToken).mockResolvedValue({ email: "google@test.com", name: "Google User", sub: "g1", picture: "pic" });
      vi.mocked(User.findOne).mockResolvedValue(null);
      vi.mocked(User.create).mockResolvedValue(buildUser({ email: "google@test.com", authProvider: ["google"] }) as any);

      const req = { body: { token: "google-token" }, originalUrl: "/api/google-login", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await googleLogin(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it("should return 400 when the Google token verification fails", async () => {
      vi.mocked(verifyGoogleToken).mockResolvedValue(null);

      const req = { body: { token: "bad-token" }, originalUrl: "/api/google-login", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await googleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getCurrentUser", () => {
    it("should return the authenticated user's profile", async () => {
      vi.mocked(User.findById).mockReturnValue({ select: vi.fn().mockResolvedValue(buildUser() as any) } as any);

      const req = { user: { id: "user1" }, originalUrl: "/api/me", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 401 when no access token is present", async () => {
      const req = { originalUrl: "/api/me", headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("logout", () => {
    it("should clear auth cookies and blacklist the refresh token", async () => {
      vi.mocked(parseCookies).mockReturnValue({ refreshToken: "rt", accessToken: "at" });

      const req = { headers: { cookie: "refreshToken=rt" }, originalUrl: "/api/logout" } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await logout(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should not error when no cookies are present", async () => {
      vi.mocked(parseCookies).mockReturnValue({});

      const req = { headers: {}, originalUrl: "/api/logout" } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await logout(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
