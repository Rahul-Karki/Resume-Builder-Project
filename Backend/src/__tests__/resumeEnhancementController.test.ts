import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../models/Resume", () => ({
  default: Object.assign(vi.fn(), { findOne: vi.fn(), findOneAndUpdate: vi.fn() }),
}));
vi.mock("../models/AtsAnalysis", () => ({
  default: Object.assign(vi.fn(), { findOne: vi.fn(), findOneAndUpdate: vi.fn(), findOneAndDelete: vi.fn() }),
}));
vi.mock("../models/ResumeVersion", () => ({
  default: Object.assign(vi.fn(), { findOne: vi.fn(), findOneAndDelete: vi.fn() }),
}));
vi.mock("../models/Template", () => ({ default: Object.assign(vi.fn(), { findOne: vi.fn() }) }));
vi.mock("../models/TemplateUsage", () => ({ default: { recordUse: vi.fn() } }));
vi.mock("../services/resumeVersionService", () => ({ createResumeVersion: vi.fn() }));
vi.mock("../lib/workerShim");
vi.mock("../middleware/redisCache", () => ({ invalidateRedisCache: vi.fn() }));
vi.mock("../utils/aiCredits", () => ({
  deductAiCredits: vi.fn().mockResolvedValue({ aiCreditsRemaining: 50, aiCreditsResetAt: new Date(), aiCreditsPlan: "free" }),
  refreshAiCreditsIfNeeded: vi.fn().mockResolvedValue({ aiCreditsRemaining: 50, aiCreditsResetAt: new Date(), aiCreditsPlan: "free" }),
  assertAiCreditsAvailable: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../utils/dailyUsage", () => ({ reserveDailyUsage: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../utils/controllerObservability", () => ({ startControllerSpan: vi.fn(() => ({})), markSpanSuccess: vi.fn(), markSpanError: vi.fn(), finishControllerSpan: vi.fn() }));
vi.mock("../utils/errorResponse", () => ({ sendErrorResponse: vi.fn((res: any, err: any) => res.status(err?.statusCode ?? 500).json({ message: err?.message ?? "Error" })) }));
vi.mock("../errors/AppError", () => ({
  AuthError: class extends Error { statusCode = 401; code = "AUTH_REQUIRED"; constructor(m: string) { super(m); } },
}));
vi.mock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { analyzeAts, getLatestAtsAnalysis, restoreResumeVersion } from "../controllers/resumeEnhancementController";
import Resume from "../models/Resume";
import AtsAnalysis from "../models/AtsAnalysis";
import ResumeVersion from "../models/ResumeVersion";
import Template from "../models/Template";
import { processAtsAnalysisJob } from "../lib/workerShim";

const mockLeanFindOne = (result: any) => ({ sort: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(result) });
const makeResume = (overrides = {}) => ({
  _id: "res1",
  userId: "user1",
  templateId: "tpl1",
  title: "My Resume",
  personalInfo: { summary: "old summary" },
  sections: { experience: [{ company: "Co", title: "Engineer", bullets: ["old bullet"] }] },
  toObject: vi.fn(function () { return { ...this }; }),
  ...overrides,
});

describe("resumeEnhancementController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("analyzeAts", () => {
    it("should enqueue an ATS analysis and return the analysis ID", async () => {
      vi.mocked(processAtsAnalysisJob).mockResolvedValue({ analysisId: "analysis1" } as never);
      vi.mocked(Resume.findOne).mockResolvedValue(makeResume({ toObject: vi.fn(() => ({ _id: "res1", title: "My Resume" })) }) as any);
      vi.mocked(AtsAnalysis.findOne).mockReturnValue(mockLeanFindOne(null) as any);
      vi.mocked(AtsAnalysis.findOneAndUpdate).mockResolvedValue({ _id: "analysis1", resumeId: "res1" } as any);
      vi.mocked(Template.findOne).mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(null) } as any);

      const req = { user: { id: "user1" }, params: { id: "res1" }, body: { jobTitle: "Software Engineer" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() } as any;

      await analyzeAts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 404 when the resume is not found", async () => {
      vi.mocked(Resume.findOne).mockResolvedValue(null);

      const req = { user: { id: "user1" }, params: { id: "bad-id" }, body: { jobTitle: "Engineer" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await analyzeAts(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getLatestAtsAnalysis", () => {
    it("should return the most recent ATS analysis for the resume", async () => {
      vi.mocked(AtsAnalysis.findOne).mockReturnValue(mockLeanFindOne({ _id: "analysis1", overallScore: 85 }) as any);

      const req = { user: { id: "user1" }, params: { id: "res1" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getLatestAtsAnalysis(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 404 when no analysis exists", async () => {
      vi.mocked(AtsAnalysis.findOne).mockReturnValue(mockLeanFindOne(null) as any);

      const req = { user: { id: "user1" }, params: { id: "res1" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getLatestAtsAnalysis(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("restoreResumeVersion", () => {
    it("should restore a previous version of the resume", async () => {
      const snapshot = { title: "Old Resume", personalInfo: { summary: "old" }, sections: {} };
      vi.mocked(ResumeVersion.findOne).mockReturnValue(mockLeanFindOne({ _id: "ver1", resumeId: "res1", snapshot }) as any);
      vi.mocked(Resume.findOne).mockResolvedValue(makeResume() as any);
      vi.mocked(Resume.findOneAndUpdate).mockResolvedValue(makeResume({ title: "Restored" }) as any);
      vi.mocked(Template.findOne).mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(null) } as any);

      const req = { user: { id: "user1" }, params: { id: "res1", versionNo: "2" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await restoreResumeVersion(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 404 when the version does not exist", async () => {
      vi.mocked(ResumeVersion.findOne).mockReturnValue(mockLeanFindOne(null) as any);

      const req = { user: { id: "user1" }, params: { id: "res1", versionNo: "99" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await restoreResumeVersion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
