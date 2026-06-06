import { describe, it, expect, vi, beforeEach } from "vitest";
import User from "../../models/User";
import { AppError } from "../../errors/AppError";

vi.mock("../../models/User", () => ({
  default: {
    findOneAndUpdate: vi.fn(),
    findById: vi.fn(() => ({
      select: vi.fn(() => ({
        lean: vi.fn(),
      })),
    })),
  },
}));

vi.mock("../../errors/AppError", () => ({
  AppError: vi.fn(function (this: any, message: string, opts?: any) {
    this.message = message;
    this.statusCode = opts?.statusCode;
    this.code = opts?.code;
    this.details = opts?.details;
    this.expose = opts?.expose;
  }),
}));

const getToday = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
};
const TODAY = getToday();

const makeMockUser = (overrides: Record<string, unknown> = {}) => ({
  _id: "user-1",
  dailyUsage: { date: TODAY, aiAssistant: 2, atsScore: 0 },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("dailyUsage", () => {
  describe("reserveDailyUsage", () => {
    it("should allow usage when under limit", async () => {
      const { reserveDailyUsage } = await import("../../utils/dailyUsage");
      (User.findOneAndUpdate as any).mockResolvedValue({
        dailyUsage: { date: TODAY, aiAssistant: 3, atsScore: 0 },
      });

      await expect(reserveDailyUsage("user-1", "ai-assistant")).resolves.toBeUndefined();
    });

    it("should throw 429 when daily limit is exceeded", async () => {
      const { reserveDailyUsage } = await import("../../utils/dailyUsage");
      (User.findOneAndUpdate as any).mockResolvedValue(null);

      await expect(reserveDailyUsage("user-1", "ai-assistant")).rejects.toThrow("Daily usage limit reached");
    });

    it("should allow ATS score usage when under limit of 2", async () => {
      const { reserveDailyUsage } = await import("../../utils/dailyUsage");
      (User.findOneAndUpdate as any).mockResolvedValue({
        dailyUsage: { date: TODAY, aiAssistant: 0, atsScore: 1 },
      });

      await expect(reserveDailyUsage("user-1", "ats-score")).resolves.toBeUndefined();
    });

    it("should throw 429 when ATS score limit of 2 is exceeded", async () => {
      const { reserveDailyUsage } = await import("../../utils/dailyUsage");
      (User.findOneAndUpdate as any).mockResolvedValue(null);

      await expect(reserveDailyUsage("user-1", "ats-score")).rejects.toThrow("Daily usage limit reached");
    });

    it("should use findOneAndUpdate with aggregation pipeline", async () => {
      const { reserveDailyUsage } = await import("../../utils/dailyUsage");
      (User.findOneAndUpdate as any).mockResolvedValue({
        dailyUsage: { date: TODAY, aiAssistant: 1, atsScore: 0 },
      });

      await reserveDailyUsage("user-1", "ai-assistant");

      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "user-1" }),
        expect.arrayContaining([expect.objectContaining({ $set: expect.anything() })]),
        expect.objectContaining({ new: true, updatePipeline: true }),
      );
    });
  });

  describe("getDailyUsage", () => {
    it("should return current day usage counts", async () => {
      const { getDailyUsage } = await import("../../utils/dailyUsage");
      const mockLean = vi.fn().mockResolvedValue({
        dailyUsage: { date: TODAY, aiAssistant: 3, atsScore: 1 },
      });
      const mockSelect = vi.fn(() => ({ lean: mockLean }));
      (User.findById as any).mockReturnValue({ select: mockSelect });

      const result = await getDailyUsage("user-1");

      expect(result.aiAssistant).toBe(3);
      expect(result.atsScore).toBe(1);
    });

    it("should return zeros when no usage record exists", async () => {
      const { getDailyUsage } = await import("../../utils/dailyUsage");
      const mockLean = vi.fn().mockResolvedValue(null);
      const mockSelect = vi.fn(() => ({ lean: mockLean }));
      (User.findById as any).mockReturnValue({ select: mockSelect });

      const result = await getDailyUsage("user-1");

      expect(result.aiAssistant).toBe(0);
      expect(result.atsScore).toBe(0);
    });

    it("should return zeros when date is stale (previous day)", async () => {
      const { getDailyUsage } = await import("../../utils/dailyUsage");
      const mockLean = vi.fn().mockResolvedValue({
        dailyUsage: { date: "1999-12-31", aiAssistant: 5, atsScore: 2 },
      });
      const mockSelect = vi.fn(() => ({ lean: mockLean }));
      (User.findById as any).mockReturnValue({ select: mockSelect });

      const result = await getDailyUsage("user-1");

      expect(result.aiAssistant).toBe(0);
      expect(result.atsScore).toBe(0);
    });
  });
});
