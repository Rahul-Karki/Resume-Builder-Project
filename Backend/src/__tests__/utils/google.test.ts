import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetPayload = vi.fn();
const mockVerifyIdToken = vi.fn();
vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn(function () {
    this.verifyIdToken = mockVerifyIdToken;
  }),
}));

vi.mock("../../config/env", () => ({
  env: { GOOGLE_CLIENT_ID: "test-google-client-id" },
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("google", () => {
  describe("verifyGoogleToken", () => {
    it("should return the user payload when the Google token is valid", async () => {
      const payload = { email: "test@example.com", sub: "123" };
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => payload });
      const { verifyGoogleToken } = await import("../../utils/google");
      const result = await verifyGoogleToken("valid-token");
      expect(result).toEqual(payload);
    });

    it("should throw when the audience does not match the client ID", async () => {
      mockVerifyIdToken.mockRejectedValue(new Error("Invalid audience"));
      const { verifyGoogleToken } = await import("../../utils/google");
      await expect(verifyGoogleToken("bad-audience-token")).rejects.toThrow("Invalid audience");
    });

    it("should throw when the token is expired", async () => {
      mockVerifyIdToken.mockRejectedValue(new Error("Token expired"));
      const { verifyGoogleToken } = await import("../../utils/google");
      await expect(verifyGoogleToken("expired-token")).rejects.toThrow("Token expired");
    });
  });
});
