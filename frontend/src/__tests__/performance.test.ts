// ─── Module: performance ───────────────────────────
// Description: Performance monitoring and metric collection for client interactions
// Coverage targets: performanceMonitor, usePerformanceMonitor, withPerformanceMonitoring, recordMetric, startTimer, endTimer, measureApiCall, measureComponentRender, getMetrics, getAverageMetric, getMetricsSummary, clearMetrics, exportMetrics
// Last updated: 2026-05-23

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: {
    logPerformance: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logApiRequest: vi.fn(),
    logUserAction: vi.fn(),
  },
}));

import { performanceMonitor } from "@/utils/performance";

describe("performance", () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
  });

  it("should record a named metric when recordMetric is called", () => {
    performanceMonitor.recordMetric("render", 16, "ms", { route: "/builder" });

    const metrics = performanceMonitor.getMetrics("render");
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      name: "render",
      value: 16,
      unit: "ms",
      context: { route: "/builder" },
    });
  });

  it("should compute the average for repeated metrics when values are recorded", () => {
    performanceMonitor.recordMetric("api_save", 10);
    performanceMonitor.recordMetric("api_save", 30);

    expect(performanceMonitor.getAverageMetric("api_save")).toBe(20);
    expect(performanceMonitor.getMetricsSummary().api_save).toMatchObject({
      count: 2,
      min: 10,
      max: 30,
      avg: 20,
    });
  });

  it("should measure a successful API call and tag the metric as successful", async () => {
    const result = await performanceMonitor.measureApiCall(
      "saveResume",
      async () => "ok",
      { route: "/api/resumes" },
    );

    expect(result).toBe("ok");

    const metrics = performanceMonitor.getMetrics("api_saveResume");
    expect(metrics).toHaveLength(1);
    expect(metrics[0].context).toMatchObject({ route: "/api/resumes", success: true });
  });

  it("should measure a failed API call and keep the error context", async () => {
    await expect(
      performanceMonitor.measureApiCall(
        "saveResume",
        async () => {
          throw new Error("boom");
        },
        { route: "/api/resumes" },
      ),
    ).rejects.toThrow("boom");

    const metrics = performanceMonitor.getMetrics("api_saveResume");
    expect(metrics).toHaveLength(1);
    expect(metrics[0].context).toMatchObject({ route: "/api/resumes", success: false, error: "boom" });
  });
});