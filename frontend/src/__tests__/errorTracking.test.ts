import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    getSessionInfo: vi.fn(() => ({ sessionId: "session_mock", userId: undefined, logCount: 0, sessionStart: new Date().toISOString() })),
  },
}));

type ErrorTrackingModule = typeof import("@/utils/errorTracking");

let errorTracking: ErrorTrackingModule;

describe("errorTracking", () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();

    errorTracking = await import("@/utils/errorTracking");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should capture an error with context when trackError is called", () => {
    localStorage.setItem("userId", "user-123");

    const errorId = errorTracking.errorTracker.trackError(
      "Resume save failed",
      new Error("boom"),
      { type: "user_error", route: "/builder" },
    );

    expect(errorTracking.errorTracker.getErrorStats()).toMatchObject({
      total: 1,
      errorsByType: { user_error: 1 },
    });
  });

  it("should capture errors with trackError", () => {
    errorTracking.errorTracker.trackError("API fetch failed", new Error("server exploded"), { status: 500 });

    const [report] = errorTracking.errorTracker.getErrors();
    expect(report).toMatchObject({
      message: "API fetch failed",
      context: { status: 500 },
    });
  });

  it("should group duplicate errors and increment count", () => {
    const err = new Error("network timeout");
    const id1 = errorTracking.errorTracker.trackError("Request failed", err, { url: "/api/data" });
    const id2 = errorTracking.errorTracker.trackError("Request failed", err, { url: "/api/data" });

    expect(id1).toBe(id2);
    const [report] = errorTracking.errorTracker.getErrors();
    expect(report.count).toBe(2);
  });

  it("should not crash in SSR (no window/navigator)", () => {
    const win = globalThis.window;
    const nav = globalThis.navigator;
    delete (globalThis as any).window;
    delete (globalThis as any).navigator;

    errorTracking.errorTracker.trackError("SSR safe", new Error("test"));
    const [report] = errorTracking.errorTracker.getErrors();

    expect(report.userAgent).toBe("ssr");
    expect(report.url).toBe("ssr");

    globalThis.window = win;
    globalThis.navigator = nav;
  });
});
