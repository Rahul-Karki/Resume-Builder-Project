import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEmailsSend = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn(function () { return { emails: { send: mockEmailsSend } }; }),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("sendEmail", () => {
  describe("sendEmail", () => {
    it("should send an email via Resend API", async () => {
      mockEmailsSend.mockResolvedValue({ error: null });
      const { sendEmail } = await import("../../utils/sendEmail");
      await expect(sendEmail("test@example.com", "https://reset.link")).resolves.toBeUndefined();
      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({ to: "test@example.com", subject: "Reset Password" }),
      );
    });

    it("should throw when the API key is invalid", async () => {
      mockEmailsSend.mockResolvedValue({ error: { message: "Invalid API key" } });
      const { sendEmail } = await import("../../utils/sendEmail");
      await expect(sendEmail("test@example.com", "https://reset.link")).rejects.toThrow("Invalid API key");
    });

    it("should handle network errors gracefully", async () => {
      mockEmailsSend.mockRejectedValue(new Error("Network error"));
      const { sendEmail } = await import("../../utils/sendEmail");
      await expect(sendEmail("test@example.com", "https://reset.link")).rejects.toThrow("Network error");
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("should include the reset link in the email body", async () => {
      mockEmailsSend.mockResolvedValue({ error: null });
      const { sendEmail } = await import("../../utils/sendEmail");
      await sendEmail("user@test.com", "https://example.com/reset?token=abc");
      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("https://example.com/reset?token=abc"),
        }),
      );
    });
  });
});
