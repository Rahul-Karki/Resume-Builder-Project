// ─── Module: errorTracking ───────────────────────────
// Description: Client-side error capture and Sentry dispatch
// Coverage targets: ErrorTracker, errorTracker, useErrorTracker, trackError, trackApiError, trackReactError
// Last updated: 2026-05-23

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

type ErrorTrackingModule = typeof import("@/utils/errorTracking");

let errorTracking: ErrorTrackingModule;

describe("errorTracking", () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      clone: () => ({ text: async () => "" }),
    })));

    errorTracking = await import("@/utils/errorTracking");
    errorTracking.errorTracker.clearErrors();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should capture an error with context when trackError is called", () => {
    localStorage.setItem("userId", "user-123");
    localStorage.setItem("sessionId", "session_123_test");

    const errorId = errorTracking.errorTracker.trackError(
      "Resume save failed",
      new Error("boom"),
      { type: "user_error", route: "/builder" },
    );

    const report = errorTracking.errorTracker.getError(errorId);
    expect(report).toMatchObject({
      message: "Resume save failed",
      userId: "user-123",
      sessionId: "session_123_test",
      resolved: false,
      context: { type: "user_error", route: "/builder" },
    });
    expect(errorTracking.errorTracker.getErrorStats()).toMatchObject({
      total: 1,
      resolved: 0,
      unresolved: 1,
      errorsByType: { user_error: 1 },
    });
  });

  it("should classify API failures when trackApiError is called", () => {
    errorTracking.errorTracker.trackApiError("fetch", "/api/resumes", 500, "server exploded");

    const [report] = errorTracking.errorTracker.getErrors();
    expect(report).toMatchObject({
      message: "API fetch /api/resumes failed with status 500",
      context: {
        method: "fetch",
        url: "/api/resumes",
        status: 500,
        responseText: "server exploded",
        type: "api_error",
      },
    });
  });

  it("should mark an error resolved when fixed-it feedback is added", () => {
    const errorId = errorTracking.errorTracker.trackError("Validation error", new Error("bad input"), {
      type: "user_error",
    });

    errorTracking.errorTracker.addFeedback(errorId, {
      errorId,
      feedback: "fixed-it",
      timestamp: new Date().toISOString(),
    });

    expect(errorTracking.errorTracker.getError(errorId)?.resolved).toBe(true);
    expect(errorTracking.errorTracker.getErrorFeedback(errorId)).toHaveLength(1);
  });
});
