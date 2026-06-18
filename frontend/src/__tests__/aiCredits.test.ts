import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/utils/errorTracking", () => ({
  errorTracker: { trackError: vi.fn(), initGlobalHandlers: vi.fn() },
}));

describe("aiCredits", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { aiCreditsManager } = await import("../utils/aiCredits");
    aiCreditsManager.clearAllData();
  });

  it("should start with default credits", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    expect(aiCreditsManager.getCurrentCredits()).toBe(200);
  });

  it("should sync credits from server", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    aiCreditsManager.syncFromServer({ remaining: 150, resetAt: "2026-06-01" });
    expect(aiCreditsManager.getCurrentCredits()).toBe(150);
  });

  it("should handle null sync data", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    expect(aiCreditsManager.getCurrentCredits()).toBe(200);
    aiCreditsManager.syncFromServer(null);
    expect(aiCreditsManager.getCurrentCredits()).toBe(200);
  });

  it("should estimate credits for operations", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    expect(aiCreditsManager.estimateCredits("improve-text")).toBe(2);
    expect(aiCreditsManager.estimateCredits("enhance-bullet")).toBe(2);
    expect(aiCreditsManager.estimateCredits("ats-analysis")).toBe(5);
  });

  it("should estimate extra credits for long text", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    expect(aiCreditsManager.estimateCredits("improve-text", 100)).toBe(2);
    expect(aiCreditsManager.estimateCredits("improve-text", 600)).toBe(3);
    expect(aiCreditsManager.estimateCredits("improve-text", 2000)).toBe(4);
  });

  it("should check if user can afford operation", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    aiCreditsManager.syncFromServer({ remaining: 10 });
    expect(aiCreditsManager.canAfford("improve-text")).toBe(true);
    expect(aiCreditsManager.canAfford("ats-analysis")).toBe(true);

    aiCreditsManager.syncFromServer({ remaining: 3 });
    expect(aiCreditsManager.canAfford("ats-analysis")).toBe(false);
  });

  it("should record usage", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    await aiCreditsManager.recordUsage("improve-text", 2);
    expect(aiCreditsManager.getUsageHistory().length).toBe(1);
    expect(aiCreditsManager.getUsageStats().totalOperations).toBe(1);
  });

  it("should record failed usage", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    await aiCreditsManager.recordFailedUsage("improve-text", 2, new Error("API Error"));
    const usage = aiCreditsManager.getUsageHistory();
    expect(usage[0].status).toBe("failed");
    expect(aiCreditsManager.getUsageStats().failedOperations).toBe(1);
  });

  it("should provide usage stats", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    await aiCreditsManager.recordUsage("improve-text", 2, { field: "summary" });
    await aiCreditsManager.recordUsage("ats-analysis", 5);
    const stats = aiCreditsManager.getUsageStats();
    expect(stats.totalOperations).toBe(2);
    expect(stats.successfulOperations).toBe(2);
    expect(stats.totalCreditsUsed).toBe(7);
    expect(stats.usageByOperation["improve-text"]).toBe(2);
    expect(stats.usageByOperation["ats-analysis"]).toBe(5);
  });

  it("should create and acknowledge alerts", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    aiCreditsManager.syncFromServer({ remaining: 5 });

    const unacknowledged = aiCreditsManager.getAlerts(false);
    expect(unacknowledged.length).toBeGreaterThan(0);
    expect(unacknowledged[0].type).toBe("low-credits");

    aiCreditsManager.acknowledgeAlert(unacknowledged[0].id);
    expect(aiCreditsManager.getAlerts(false).length).toBe(0);
  });

  it("should support credit change listeners", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    const listener = vi.fn();
    aiCreditsManager.onCreditsChange(listener);
    aiCreditsManager.syncFromServer({ remaining: 50 });
    expect(listener).toHaveBeenCalledWith(50);
  });

  it("should clear all data", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    await aiCreditsManager.recordUsage("improve-text", 2);
    aiCreditsManager.clearAllData();
    expect(aiCreditsManager.getUsageHistory()).toHaveLength(0);
    expect(aiCreditsManager.getAlerts()).toHaveLength(0);
  });

  it("should provide useAICredits hook", async () => {
    const { useAICredits, aiCreditsManager } = await import("../utils/aiCredits");
    aiCreditsManager.syncFromServer({ remaining: 100 });

    const { result } = renderHook(() => useAICredits());
    expect(result.current.credits).toBe(100);
    expect(typeof result.current.recordUsage).toBe("function");
    expect(typeof result.current.canAfford).toBe("function");
  });

  it("should use singleton pattern", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    const { aiCreditsManager: manager2 } = await import("../utils/aiCredits");
    expect(aiCreditsManager).toBe(manager2);
  });
});
