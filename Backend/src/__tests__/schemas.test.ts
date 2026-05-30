import { describe, it, expect } from "vitest";

describe("emailSchema", () => {
  it("validates a correct email", async () => {
    const { emailSchema } = await import("../validation/schemas");
    const result = emailSchema.safeParse("Test@Example.COM");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("test@example.com");
    }
  });

  it("rejects an invalid email", async () => {
    const { emailSchema } = await import("../validation/schemas");
    const result = emailSchema.safeParse("not-an-email");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", async () => {
    const { emailSchema } = await import("../validation/schemas");
    const result = emailSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("trims and lowercases email", async () => {
    const { emailSchema } = await import("../validation/schemas");
    const result = emailSchema.safeParse("  USER@Example.COM  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("user@example.com");
    }
  });

  it("rejects email exceeding max length", async () => {
    const { emailSchema } = await import("../validation/schemas");
    const longLocal = "a".repeat(250);
    const result = emailSchema.safeParse(`${longLocal}@b.com`);
    expect(result.success).toBe(false);
  });
});
