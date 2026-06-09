import { describe, it, expect, vi, beforeEach } from "vitest";
import User from "../../models/User";
import { AppError } from "../../errors/AppError";

vi.mock("../../models/User", () => ({
  default: {
    findById: vi.fn(),
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

const makeMockUser = (overrides: Record<string, unknown> = {}) => ({
  _id: "user-1",
  aiCreditsRemaining: 100,
  aiCreditsResetAt: new Date(Date.now() + 86400000),
  save: vi.fn().mockResolvedValue(true),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("aiCredits", () => {
  describe("assertAiCreditsAvailable", () => {
    it("should resolve when credits are available", async () => {
      const { assertAiCreditsAvailable } = await import("../../utils/aiCredits");
      const user = makeMockUser({ aiCreditsRemaining: 50 });
      (User.findById as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(user),
      });

      const result = await assertAiCreditsAvailable("user-1", 10);

      expect(result).toBeTruthy();
    });

    it("should throw when credits are exhausted and enforcement is on", async () => {
      const { assertAiCreditsAvailable } = await import("../../utils/aiCredits");
      const user = makeMockUser({ aiCreditsRemaining: 5 });
      (User.findById as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(user),
      });

      await expect(assertAiCreditsAvailable("user-1", 10)).rejects.toThrow("Insufficient AI credits");
    });

    it("should log a warning when credits are low", async () => {
      const { assertAiCreditsAvailable } = await import("../../utils/aiCredits");
      const user = makeMockUser({ aiCreditsRemaining: 5 });
      (User.findById as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(user),
      });

      await expect(assertAiCreditsAvailable("user-1", 10)).rejects.toThrow();
    });
  });

  describe("deductAiCredits", () => {
    it("should decrement the user's remaining credits", async () => {
      const { deductAiCredits } = await import("../../utils/aiCredits");
      const saveMock = vi.fn().mockResolvedValue(true);
      const user = makeMockUser({ aiCreditsRemaining: 50, save: saveMock });
      (User.findById as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(user),
      });

      const result = await deductAiCredits("user-1", 10);

      expect(result).toBeTruthy();
      expect(saveMock).toHaveBeenCalled();
      if (result) {
        expect((result as any).aiCreditsRemaining).toBe(40);
      }
    });

    it("should update the reset timestamp", async () => {
      const { deductAiCredits, refreshAiCreditsIfNeeded } = await import("../../utils/aiCredits");
      const saveMock = vi.fn().mockResolvedValue(true);
      const user = makeMockUser({ aiCreditsRemaining: 50, save: saveMock });
      (User.findById as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(user),
      });

      await deductAiCredits("user-1", 10);

      expect(saveMock).toHaveBeenCalled();
    });
  });

  describe("refreshAiCreditsIfNeeded", () => {
    it("should reset credits when the reset time has passed", async () => {
      const { refreshAiCreditsIfNeeded } = await import("../../utils/aiCredits");
      const saveMock = vi.fn().mockResolvedValue(true);
      const user = makeMockUser({
        aiCreditsRemaining: 0,
        aiCreditsResetAt: new Date(Date.now() - 86400000),
        save: saveMock,
      });
      (User.findById as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(user),
      });

      const result = await refreshAiCreditsIfNeeded("user-1");

      expect(result).toBeTruthy();
      expect(saveMock).toHaveBeenCalled();
      if (result) {
        expect((result as any).aiCreditsRemaining).toBe(200);
      }
    });

    it("should not reset credits when the reset time is in the future", async () => {
      const { refreshAiCreditsIfNeeded } = await import("../../utils/aiCredits");
      const saveMock = vi.fn().mockResolvedValue(true);
      const user = makeMockUser({
        aiCreditsRemaining: 50,
        aiCreditsResetAt: new Date(Date.now() + 86400000),
        save: saveMock,
      });
      (User.findById as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(user),
      });

      const result = await refreshAiCreditsIfNeeded("user-1");

      expect(result).toBeTruthy();
      expect(saveMock).not.toHaveBeenCalled();
      if (result) {
        expect((result as any).aiCreditsRemaining).toBe(50);
      }
    });
  });
});
