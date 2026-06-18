import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/errorTracking", () => ({
  errorTracker: {
    trackError: vi.fn(),
    initGlobalHandlers: vi.fn(),
    getState: vi.fn(),
  },
}));

describe("lib/errorTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should report client error with source", async () => {
    const { reportClientError } = await import("../lib/errorTracking");
    const { errorTracker } = await import("@/utils/errorTracking");

    reportClientError(new Error("Test error"), "react-boundary");
    expect(errorTracker.trackError).toHaveBeenCalledWith("Test error", expect.any(Error), { source: "react-boundary" });
  });

  it("should handle non-Error objects", async () => {
    const { reportClientError } = await import("../lib/errorTracking");
    const { errorTracker } = await import("@/utils/errorTracking");

    reportClientError("string error", "window-error");
    expect(errorTracker.trackError).toHaveBeenCalledWith("Unknown client error", "string error", { source: "window-error" });
  });

  it("should initialize global error handlers", async () => {
    const { initializeClientErrorTracking } = await import("../lib/errorTracking");
    const { errorTracker } = await import("@/utils/errorTracking");

    initializeClientErrorTracking();
    expect(errorTracker.initGlobalHandlers).toHaveBeenCalled();
  });
});
