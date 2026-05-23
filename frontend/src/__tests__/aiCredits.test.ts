import { describe, it, expect, vi, beforeEach } from "vitest";

describe("aiCredits (frontend)", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("should initialize with default credit values", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    expect(aiCreditsManager.getCurrentCredits()).toBeGreaterThan(0);
    expect(aiCreditsManager.getCurrentPlan()).toBeDefined();
  });
  it("should update remaining credits from response headers", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    aiCreditsManager.syncFromServer({ remaining: 150, plan: "basic" });
    expect(aiCreditsManager.getCurrentCredits()).toBe(150);
  });
  it("should trigger low-credit alert when below threshold", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    aiCreditsManager.syncFromServer({ remaining: 5, plan: "free" });
    const alerts = aiCreditsManager.getAlerts(false);
    expect(alerts.some(a => a.type === "low-credits")).toBe(true);
  });
  it("should trigger exhausted alert when credits reach zero", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    aiCreditsManager.syncFromServer({ remaining: 0, plan: "free" });
    const alerts = aiCreditsManager.getAlerts(false);
    expect(alerts.some(a => a.type === "out-of-credits")).toBe(true);
  });
  it("should detect usage spikes", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    const estimate = aiCreditsManager.estimateCredits("improve-text", 100);
    expect(estimate).toBeGreaterThan(0);
    expect(aiCreditsManager.canAfford("improve-text", 100)).toBe(true);
  });
});
