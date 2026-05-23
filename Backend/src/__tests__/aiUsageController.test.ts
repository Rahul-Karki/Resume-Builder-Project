import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAiUsageStats, getAiRequestHistory } from "../controllers/aiUsageController";
import AiUsage from "../models/AiUsage";

vi.mock("../models/AiUsage");
vi.mock("../utils/controllerObservability", () => ({ startControllerSpan: vi.fn(() => ({})), markSpanSuccess: vi.fn(), markSpanError: vi.fn(), finishControllerSpan: vi.fn() }));
vi.mock("../utils/errorResponse", () => ({ sendErrorResponse: vi.fn((res, err, fb) => res.status((fb?.statusCode ?? 401)).json({ message: fb?.message ?? "Unauthorized" })) }));
vi.mock("../errors/AppError", () => ({ AuthError: class extends Error { constructor(m: string) { super(m); } } }));
vi.mock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

describe("aiUsageController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAiUsageStats", () => {
    it("should return aggregated usage stats for the authenticated user", async () => {
      vi.mocked(AiUsage.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([{ userId: "user1", feature: "improve-text", provider: "openai", modelName: "gpt-4", success: true, fallback: false, inputTokens: 10, outputTokens: 20, costUsd: 0.001, createdAt: new Date() }]) } as any);

      const req = { user: { id: "user1" }, query: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getAiUsageStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.data.totalRequests).toBe(1);
    });

    it("should return zeros when the user has no AI usage", async () => {
      vi.mocked(AiUsage.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as any);

      const req = { user: { id: "user1" }, query: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getAiUsageStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.data.totalRequests).toBe(0);
    });

    it("should return 401 when the user is not authenticated", async () => {
      const req = {} as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getAiUsageStats(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("getAiRequestHistory", () => {
    it("should return a paginated list of AI requests", async () => {
      vi.mocked(AiUsage.find).mockReturnValue({ sort: vi.fn().mockReturnValue({ skip: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([{ userId: "user1" }]) }) }) }) } as any);
      vi.mocked(AiUsage.countDocuments).mockResolvedValue(1);

      const req = { user: { id: "user1" }, query: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getAiRequestHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return an empty array when there is no history", async () => {
      vi.mocked(AiUsage.find).mockReturnValue({ sort: vi.fn().mockReturnValue({ skip: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }) }) } as any);
      vi.mocked(AiUsage.countDocuments).mockResolvedValue(0);

      const req = { user: { id: "user1" }, query: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getAiRequestHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.data).toHaveLength(0);
    });
  });
});
