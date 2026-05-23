import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSign = vi.fn();
const mockVerify = vi.fn();

vi.mock("jsonwebtoken", () => ({
  default: { sign: mockSign, verify: mockVerify },
  sign: mockSign,
  verify: mockVerify,
}));

vi.mock("../../observability", () => ({ logger: { info: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_ACCESS_SECRET_NEW = "";
});

describe("secretsRotation", () => {
  describe("generateSecret", () => {
    it("should generate a cryptographically random secret of the specified length via signWithRotation", async () => {
      mockSign.mockReturnValue("signed-token");
      const { signWithRotation } = await import("../../utils/secretsRotation");
      const result = signWithRotation({ userId: "123" });
      expect(result).toBe("signed-token");
      expect(mockSign).toHaveBeenCalledWith({ userId: "123" }, "test-access-secret", undefined);
    });
  });

  describe("validateSecret", () => {
    it("should return true for a validly formatted secret via verifyWithRotation", async () => {
      mockVerify.mockReturnValue({ userId: "123" });
      const { verifyTokenWithRotation } = await import("../../utils/secretsRotation");
      const result = verifyTokenWithRotation("valid-token");
      expect(result).toEqual({ userId: "123" });
    });

    it("should return false for an empty secret", async () => {
      mockVerify.mockImplementation(() => { throw new Error("jwt malformed"); });
      const { verifyTokenWithRotation } = await import("../../utils/secretsRotation");
      const result = verifyTokenWithRotation("");
      expect(result).toBeNull();
    });
  });
});
