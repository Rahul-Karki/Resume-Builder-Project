import { describe, it, expect, vi, beforeEach } from "vitest";

describe("aiCredits (frontend)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should initialize with default credit values", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    expect(aiCreditsManager.getCurrentCredits()).toBeGreaterThan(0);
  });

  it("should update remaining credits from server sync", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    aiCreditsManager.syncFromServer({ remaining: 150 });
    expect(aiCreditsManager.getCurrentCredits()).toBe(150);
  });

  it("should detect usage spikes", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    const estimate = aiCreditsManager.estimateCredits("improve-text", 100);
    expect(estimate).toBeGreaterThan(0);
    expect(aiCreditsManager.canAfford("improve-text", 100)).toBe(true);
  });

  it("should return false when credits are insufficient", async () => {
    const { aiCreditsManager } = await import("../utils/aiCredits");
    aiCreditsManager.syncFromServer({ remaining: 1 });
    expect(aiCreditsManager.canAfford("ats-analysis")).toBe(false);
  });
});
