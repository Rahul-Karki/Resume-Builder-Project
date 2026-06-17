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

  it("should start and end a timer", () => {
    performanceMonitor.startTimer("custom_timer");
    const duration = performanceMonitor.endTimer("custom_timer");
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it("should return 0 when ending a non-existent timer", () => {
    const duration = performanceMonitor.endTimer("nonexistent");
    expect(duration).toBe(0);
  });

  it("should get all metrics when no name given", () => {
    performanceMonitor.recordMetric("test1", 10);
    performanceMonitor.recordMetric("test2", 20);
    const all = performanceMonitor.getMetrics();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it("should return null average for unknown metric", () => {
    expect(performanceMonitor.getAverageMetric("unknown")).toBeNull();
  });

  it("should export metrics as JSON", () => {
    performanceMonitor.recordMetric("export_test", 42);
    const exported = performanceMonitor.exportMetrics();
    const parsed = JSON.parse(exported);
    expect(parsed.metrics).toBeDefined();
    expect(parsed.summary).toBeDefined();
    expect(parsed.exportedAt).toBeDefined();
  });

  it("should call performance.mark when mark is called", () => {
    const markSpy = vi.spyOn(performance, "mark").mockImplementation(() => undefined);
    performanceMonitor.mark("test_mark");
    expect(markSpy).toHaveBeenCalledWith("test_mark");
    markSpy.mockRestore();
  });

  it("should handle mark when performance is undefined", () => {
    const origPerf = (global as any).performance;
    delete (global as any).performance;
    expect(() => performanceMonitor.mark("test")).not.toThrow();
    (global as any).performance = origPerf;
  });

  it("should measure between marks", () => {
    performanceMonitor.mark("start");
    performanceMonitor.mark("end");
    performanceMonitor.measure("custom", "start", "end");
    const metrics = performanceMonitor.getMetrics("custom");
    expect(metrics).toBeDefined();
  });

  it("should handle getMetricsSummary with no metrics", () => {
    const summary = performanceMonitor.getMetricsSummary();
    expect(summary).toEqual({});
  });
});