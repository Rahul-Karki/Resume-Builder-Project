import { describe, it, expect } from "vitest";
import { calculateAICost } from "../../utils/tokenCounter";

describe("tokenCounter", () => {
  it("should calculate cost based on input and output tokens", () => {
    const cost = calculateAICost({ input: 1000, output: 500 }, "openai", "gpt-4o");
    expect(cost.input).toBe(1000 * 0.000005);
    expect(cost.output).toBe(500 * 0.000015);
    expect(cost.total).toBe(cost.input + cost.output);
  });

  it("should use the correct pricing per provider", () => {
    const openaiCost = calculateAICost({ input: 1000, output: 1000 }, "openai", "gpt-4o");
    const geminiCost = calculateAICost({ input: 1000, output: 1000 }, "gemini", "gemini-2.0-flash");
    expect(openaiCost.total).toBeGreaterThan(geminiCost.total);
  });

  it("should return 0 for zero tokens", () => {
    const cost = calculateAICost({ input: 0, output: 0 }, "openai", "gpt-4o");
    expect(cost.total).toBe(0);
  });

  it("should round to 6 decimal places", () => {
    const cost = calculateAICost({ input: 333, output: 0 }, "openai", "gpt-4o");
    const decimalPlaces = cost.input.toString().split(".")[1]?.length || 0;
    expect(decimalPlaces).toBeLessThanOrEqual(6);
  });
});
