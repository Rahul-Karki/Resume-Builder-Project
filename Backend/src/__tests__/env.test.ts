import { describe, it, expect, vi, beforeEach } from "vitest";

describe("env configuration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should parse and validate all required environment variables", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MONGO_URI", "mongodb://localhost:27017/test");
    vi.stubEnv("FRONTEND_URL", "http://localhost:3000");
    vi.stubEnv("JWT_ACCESS_SECRET", "access-secret");
    vi.stubEnv("JWT_REFRESH_SECRET", "refresh-secret");
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-id");
    const { env } = await import("../config/env");
    expect(env.MONGO_URI).toBe("mongodb://localhost:27017/test");
    expect(env.NODE_ENV).toBe("development");
  });
  it("should apply default values for optional variables", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MONGO_URI", "mongodb://localhost:27017/test");
    vi.stubEnv("FRONTEND_URL", "http://localhost:3000");
    vi.stubEnv("JWT_ACCESS_SECRET", "access-secret");
    vi.stubEnv("JWT_REFRESH_SECRET", "refresh-secret");
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-id");
    const { env } = await import("../config/env");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.SERVICE_NAME).toBe("resume-builder-backend");
  });
  it("should exit the process when a required variable is missing", async () => {
    vi.doMock("dotenv/config", () => ({}));
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MONGO_URI", "");
    vi.stubEnv("FRONTEND_URL", "");
    vi.stubEnv("JWT_ACCESS_SECRET", "");
    vi.stubEnv("JWT_REFRESH_SECRET", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    await import("../config/env");
    expect(exitSpy).toHaveBeenCalled();
    exitSpy.mockRestore();
  });
  it("should reject invalid FRONTEND_URLS entries", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MONGO_URI", "mongodb://localhost:27017/test");
    vi.stubEnv("FRONTEND_URL", "http://localhost:3000");
    vi.stubEnv("JWT_ACCESS_SECRET", "access-secret");
    vi.stubEnv("JWT_REFRESH_SECRET", "refresh-secret");
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-id");
    vi.stubEnv("FRONTEND_URLS", "not-a-url");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    await import("../config/env");
    expect(exitSpy).toHaveBeenCalled();
    exitSpy.mockRestore();
  });
});
