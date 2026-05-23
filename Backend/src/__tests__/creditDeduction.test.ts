import { describe, it, expect, vi } from "vitest";
import { creditDeductionMiddleware } from "../middleware/creditDeduction";
import { calculateEstimatedCredits } from "../utils/creditCalculator";

vi.mock("../utils/creditCalculator", () => ({
  calculateEstimatedCredits: vi.fn(),
}));

describe("creditDeductionMiddleware", () => {
  it("should attach estimated credits to the request for valid operations", async () => {
    vi.mocked(calculateEstimatedCredits).mockReturnValue(5);

    const req = { user: { id: "user1" }, body: { text: "some content" } } as any;
    const res = {} as any;
    const next = vi.fn();

    await creditDeductionMiddleware({ operation: "improve-text" })(req, res, next);

    expect(req.creditContext).toBeDefined();
    expect(req.creditContext!.estimatedCredits).toBe(5);
    expect(req.creditContext!.operation).toBe("improve-text");
    expect(next).toHaveBeenCalled();
  });

  it("should return 0 credits for unknown operation types", async () => {
    vi.mocked(calculateEstimatedCredits).mockReturnValue(0);

    const req = { user: { id: "user1" }, body: { text: "hi" } } as any;
    const res = {} as any;
    const next = vi.fn();

    await creditDeductionMiddleware({ operation: "unknown" as any })(req, res, next);

    expect(req.creditContext!.estimatedCredits).toBe(0);
    expect(next).toHaveBeenCalled();
  });

  it("should scale credit cost with input length", async () => {
    vi.mocked(calculateEstimatedCredits).mockImplementation((_op, len) => Math.floor((len || 0) / 100));

    const req = { user: { id: "user1" }, body: { text: "a".repeat(500) } } as any;
    const res = {} as any;
    const next = vi.fn();

    await creditDeductionMiddleware({ operation: "improve-text" })(req, res, next);

    expect(calculateEstimatedCredits).toHaveBeenCalledWith("improve-text", 500);
    expect(next).toHaveBeenCalled();
  });
});
