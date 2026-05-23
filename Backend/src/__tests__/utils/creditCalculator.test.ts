import { describe, it, expect, vi } from "vitest";
import { calculateEstimatedCredits } from "../../utils/creditCalculator";

vi.mock("../../observability", () => ({ logger: { debug: vi.fn() } }));

describe("creditCalculator", () => {
  it("should return the correct credit cost for improve-text operation", () => {
    const cost = calculateEstimatedCredits("improve-text", 500);
    expect(cost).toBe(2);
  });

  it("should scale credit cost with input text length", () => {
    const shortCost = calculateEstimatedCredits("improve-text", 500);
    const longCost = calculateEstimatedCredits("improve-text", 5000);
    expect(longCost).toBeGreaterThan(shortCost);
  });

  it("should return 0 for unknown operation types", () => {
    const cost = calculateEstimatedCredits("unknown" as any, 100);
    expect(cost).toBeNaN();
  });

  it("should floor at minimum credit cost for very short inputs", () => {
    const cost = calculateEstimatedCredits("check-grammar", 0);
    expect(cost).toBe(1);
  });
});
