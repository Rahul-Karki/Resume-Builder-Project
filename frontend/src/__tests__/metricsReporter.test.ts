import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetMetrics = vi.fn();
const mockClearMetrics = vi.fn();

vi.mock("@/utils/performance", () => ({
  performanceMonitor: {
    getMetrics: mockGetMetrics,
    clearMetrics: mockClearMetrics,
  },
}));

describe("metricsReporter", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetMetrics.mockReturnValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should export initMetricsReporter function", async () => {
    const mod = await import("../lib/metricsReporter");
    expect(typeof mod.initMetricsReporter).toBe("function");
  });

  it("should collect and send metrics on interval", async () => {
    mockGetMetrics.mockReturnValue([
      { name: "LCP", value: 1500, unit: "ms", context: { type: "web-vital" } },
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as any);

    const { initMetricsReporter } = await import("../lib/metricsReporter");
    const cleanup = initMetricsReporter();

    await vi.advanceTimersByTimeAsync(31000);

    expect(mockGetMetrics).toHaveBeenCalled();
    expect(mockClearMetrics).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/client-metrics"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    cleanup();
  });

  it("should not send if no metrics", async () => {
    vi.spyOn(globalThis, "fetch");

    const { initMetricsReporter } = await import("../lib/metricsReporter");
    const cleanup = initMetricsReporter();

    await vi.advanceTimersByTimeAsync(31000);

    expect(globalThis.fetch).not.toHaveBeenCalled();
    cleanup();
  });

  it("should handle fetch errors silently", async () => {
    mockGetMetrics.mockReturnValue([
      { name: "LCP", value: 1500, unit: "ms", context: {} },
    ]);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const { initMetricsReporter } = await import("../lib/metricsReporter");
    const cleanup = initMetricsReporter();

    await expect(vi.advanceTimersByTimeAsync(31000)).resolves.not.toThrow();
    cleanup();
  });

  it("should set up and tear down event listeners", async () => {
    const { initMetricsReporter } = await import("../lib/metricsReporter");
    const cleanup = initMetricsReporter();

    const removeSpy = vi.spyOn(window, "removeEventListener");
    cleanup();
    expect(removeSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    removeSpy.mockRestore();
  });
});
