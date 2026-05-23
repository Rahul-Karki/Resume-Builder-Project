import { describe, it, expect } from "vitest";
import { redactSensitive } from "../../utils/redactSensitive";

describe("redactSensitive", () => {
  it("should redact password fields", () => {
    const input = { username: "john", password: "secret123" };
    const result = redactSensitive(input) as Record<string, unknown>;
    expect(result.password).toBe("[REDACTED]");
    expect(result.username).toBe("john");
  });

  it("should redact token and secret fields", () => {
    const input = { token: "abc123", secret: "shhh" };
    const result = redactSensitive(input) as Record<string, unknown>;
    expect(result.token).toBe("[REDACTED]");
    expect(result.secret).toBe("[REDACTED]");
  });

  it("should leave non-sensitive fields unchanged", () => {
    const input = { name: "John", email: "john@example.com" };
    const result = redactSensitive(input) as Record<string, unknown>;
    expect(result.name).toBe("John");
    expect(result.email).toBe("john@example.com");
  });

  it("should handle deeply nested sensitive fields", () => {
    const input = { user: { profile: { password: "hunter2" } } };
    const result = redactSensitive(input) as any;
    expect(result.user.profile.password).toBe("[REDACTED]");
  });

  it("should return a copy without mutating the original", () => {
    const input = { password: "abc123" };
    const result = redactSensitive(input) as Record<string, unknown>;
    expect(result.password).toBe("[REDACTED]");
    expect(input.password).toBe("abc123");
  });
});
