// ─── Module: errorTracking ───────────────────────────
// Description: Client-side error capture and Sentry dispatch

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

    errorTracking = await import("@/utils/errorTracking");
    // Clear stored state; create new instance by clearing localStorage
    localStorage.removeItem("errorReports");
  });

  afterEach(() => {
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

    expect(errorTracking.errorTracker.getErrorStats()).toMatchObject({
      total: 1,
      resolved: 0,
      unresolved: 1,
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

  it("should mark an error resolved when fixed-it feedback is added", () => {
    const errorId = errorTracking.errorTracker.trackError("Validation error", new Error("bad input"), {
      type: "user_error",
    });

    errorTracking.errorTracker.addFeedback(errorId, {
      errorId,
      feedback: "fixed-it",
      timestamp: new Date().toISOString(),
    });

    const errors = errorTracking.errorTracker.getErrors(true);
    expect(errors).toHaveLength(1);
    expect(errors[0].resolved).toBe(true);
  });
});
