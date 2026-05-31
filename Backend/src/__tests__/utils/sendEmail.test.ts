import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EMAIL_PROVIDER", "console");
  vi.stubEnv("NODE_ENV", "development");
});

describe("sendEmail", () => {
  it("should resolve without error", async () => {
    const { sendEmail } = await import("../../utils/sendEmail");
    await expect(sendEmail("test@example.com", "https://reset.link")).resolves.toBeUndefined();
  });
});

describe("sendPasswordResetEmail", () => {
  it("should resolve without error", async () => {
    vi.stubEnv("FRONTEND_URL", "https://example.com");
    const { sendPasswordResetEmail } = await import("../../utils/sendEmail");
    await expect(sendPasswordResetEmail("user@test.com", "abc123")).resolves.toBeUndefined();
  });
});
