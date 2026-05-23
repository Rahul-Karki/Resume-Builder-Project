import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../models/User", () => ({
  default: Object.assign(vi.fn(), { findById: vi.fn(), findOne: vi.fn() }),
}));
vi.mock("../utils/controllerObservability", () => ({ startControllerSpan: vi.fn(() => ({})), markSpanSuccess: vi.fn(), markSpanError: vi.fn(), finishControllerSpan: vi.fn() }));
vi.mock("../utils/errorResponse", () => ({ sendErrorResponse: vi.fn((res: any, err: any) => res.status(err?.statusCode ?? 500).json({ message: err?.message ?? "Error" })) }));
vi.mock("../errors/AppError", () => ({ AuthError: class extends Error { statusCode = 401; code = "AUTH_REQUIRED"; constructor(m: string) { super(m); } } }));
vi.mock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { setupMfa, verifyMfa, disableMfa, getMfaStatus } from "../controllers/mfaController";
import User from "../models/User";

const buildUser = (overrides = {}) => ({
  _id: "user1",
  email: "test@test.com",
  name: "Test User",
  mfaEnabled: false,
  mfaMethod: null,
  mfaSecret: null,
  mfaBackupCodes: null,
  mfaSetupAt: null,
  password: "hashed-pw",
  save: vi.fn().mockResolvedValue(true),
  ...overrides,
});

describe("mfaController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("setupMfa", () => {
    it("should generate a TOTP secret and return QR code URI", async () => {
      vi.mocked(User.findById).mockResolvedValue(buildUser() as any);

      const req = { user: { id: "user1" }, headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await setupMfa(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.ok).toBe(true);
      expect(body.data.secret).toBeDefined();
    });

    it("should return 409 when MFA is already enabled", async () => {
      vi.mocked(User.findById).mockResolvedValue(buildUser({ mfaEnabled: true }) as any);

      const req = { user: { id: "user1" }, headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await setupMfa(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe("verifyMfa", () => {
    it("should return 401 when the TOTP code is invalid (real crypto)", async () => {
      vi.mocked(User.findById).mockResolvedValue(buildUser({ mfaSecret: "dGVzdC1zZWNyZXQ=", mfaSetupAt: new Date() }) as any);

      const req = { user: { id: "user1" }, body: { token: "123456" }, headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await verifyMfa(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 422 when the TOTP code is invalid", async () => {
      vi.mocked(User.findById).mockResolvedValue(buildUser({ mfaSecret: "dGVzdC1zZWNyZXQ=" }) as any);

      const req = { user: { id: "user1" }, body: { code: "000000" }, headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await verifyMfa(req, res);

      expect(res.status).toHaveBeenCalledWith(422);
    });

    it("should return 401 when no user is authenticated", async () => {
      const req = { body: {}, headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await verifyMfa(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("disableMfa", () => {
    it("should disable MFA when the correct password is provided", async () => {
      const user = buildUser({ mfaEnabled: true, mfaMethod: "totp", password: "hashed-pw" });
      vi.mocked(User.findById).mockResolvedValue(user as any);

      const req = { user: { id: "user1" }, body: { password: "correct-pw" }, headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await disableMfa(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 400 when MFA is not enabled", async () => {
      vi.mocked(User.findById).mockResolvedValue(buildUser() as any);

      const req = { user: { id: "user1" }, body: { password: "pw" }, headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await disableMfa(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getMfaStatus", () => {
    it("should return whether MFA is enabled and which method", async () => {
      vi.mocked(User.findById).mockReturnValue({ select: vi.fn().mockResolvedValue(buildUser({ mfaEnabled: true, mfaMethod: "totp" }) as any) } as any);

      const req = { user: { id: "user1" }, headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getMfaStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.data.enabled).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      const req = { headers: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getMfaStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
