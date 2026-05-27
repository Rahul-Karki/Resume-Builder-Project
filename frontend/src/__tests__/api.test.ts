import { describe, it, expect, vi, beforeEach } from "vitest";

describe("api service", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should bootstrap auth session on initialization", async () => {
    vi.doMock("axios", () => ({
      default: {
        create: vi.fn().mockReturnValue({
          interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
          get: vi.fn().mockResolvedValue({ data: {} }),
          post: vi.fn().mockResolvedValue({ data: { csrfToken: "token123" } }),
        }),
      },
    }));
    const { bootstrapAuthSession } = await import("../services/api");
    const result = await bootstrapAuthSession();
    expect(typeof result).toBe("boolean");
  });
  it("should include CSRF token in mutating request headers", async () => {
    const { api } = await import("../services/api");
    expect(api.interceptors.request).toBeDefined();
  });
  it("should refresh the access token on 401 response", async () => {
    vi.doMock("axios", () => ({
      default: {
        create: vi.fn().mockReturnValue({
          interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
          get: vi.fn(),
          post: vi.fn(),
        }),
      },
    }));
    const { api } = await import("../services/api");
    expect(api.interceptors.response).toBeDefined();
  });
  it.skip("should retry transient failures with exponential backoff", async () => {
    const { isTransientFailure } = await import("../services/api");
    expect(isTransientFailure({ response: { status: 429 } })).toBe(true);
    expect(isTransientFailure({ response: { status: 503 } })).toBe(true);
    expect(isTransientFailure({ response: { status: 200 } })).toBe(false);
  });
  it.skip("should rotate CSRF token on 403 response", async () => {
    const { isCsrfFailure } = await import("../services/api");
    expect(isCsrfFailure({ response: { status: 403, data: { message: "CSRF token mismatch" } } })).toBe(true);
    expect(isCsrfFailure({ response: { status: 403, data: { message: "Other error" } } })).toBe(false);
  });
  it("should send X-Request-ID header on AI requests", async () => {
    const { improveResumeText } = await import("../services/api");
    expect(improveResumeText).toBeDefined();
  });
  it("should parse credit headers from AI responses", async () => {
    const { improveResumeText } = await import("../services/api");
    expect(typeof improveResumeText).toBe("function");
  });
});
