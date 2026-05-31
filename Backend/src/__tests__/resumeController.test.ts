import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../models/Resume", () => ({
  default: Object.assign(vi.fn(), { find: vi.fn(), findOne: vi.fn(), create: vi.fn(), findOneAndUpdate: vi.fn(), findOneAndDelete: vi.fn(), countDocuments: vi.fn() }),
}));
vi.mock("../models/AtsAnalysis", () => ({
  default: Object.assign(vi.fn(), { aggregate: vi.fn(), findOne: vi.fn() }),
}));
vi.mock("../models/Template", () => ({ default: Object.assign(vi.fn(), { findOne: vi.fn() }) }));
vi.mock("../models/TemplateUsage", () => ({ default: { recordUse: vi.fn() } }));
vi.mock("../services/resumeVersionService", () => ({ createResumeVersion: vi.fn() }));
vi.mock("../middleware/redisCache", () => ({ invalidateRedisCache: vi.fn() }));
vi.mock("../utils/resumeTemplate", () => ({ normalizeResumeTemplateId: vi.fn((id: any) => id) }));
vi.mock("../utils/controllerObservability", () => ({ startControllerSpan: vi.fn(() => ({})), markSpanSuccess: vi.fn(), markSpanError: vi.fn(), finishControllerSpan: vi.fn() }));
vi.mock("../utils/errorResponse", () => ({ sendErrorResponse: vi.fn((res: any, err: any) => res.status(err?.statusCode ?? 500).json({ message: err?.message ?? "Error" })) }));
vi.mock("../utils/businessMetrics", () => ({ recordResumeCreated: vi.fn(), recordResumeDeleted: vi.fn() }));
vi.mock("../errors/AppError", () => ({
  AuthError: class extends Error { statusCode = 401; code = "AUTH_REQUIRED"; constructor(m: string) { super(m); } },
  NotFoundError: class extends Error { statusCode = 404; code = "NOT_FOUND"; constructor(m: string) { super(m); } },
}));
vi.mock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { getAllResumes, getResumeById, createResume, updateResume, deleteResume } from "../controllers/resumeController";
import Resume from "../models/Resume";
import AtsAnalysis from "../models/AtsAnalysis";
import Template from "../models/Template";

const mockLeanFind = (result: any) => ({ select: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(result) });
const mockResumeDoc = (overrides = {}) => ({
  _id: "res1",
  name: "My Resume",
  userId: "user1",
  templateId: "tpl1",
  toObject: vi.fn(() => ({ _id: "res1", name: "My Resume", templateId: "tpl1" })),
  ...overrides,
});

describe("resumeController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllResumes", () => {
    it("should return all resumes for the authenticated user", async () => {
      vi.mocked(Resume.countDocuments).mockResolvedValue(1);
      vi.mocked(Resume.find).mockReturnValue(mockLeanFind([{ _id: "res1", name: "My Resume", userId: "507f1f77bcf86cd799439011", templateId: "tpl1" }]) as any);
      vi.mocked(AtsAnalysis.aggregate).mockResolvedValue([]);

      const req = { user: { id: "507f1f77bcf86cd799439011" }, query: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getAllResumes(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return an empty array when the user has no resumes", async () => {
      vi.mocked(Resume.countDocuments).mockResolvedValue(0);
      vi.mocked(Resume.find).mockReturnValue(mockLeanFind([]) as any);
      vi.mocked(AtsAnalysis.aggregate).mockResolvedValue([]);

      const req = { user: { id: "507f1f77bcf86cd799439011" }, query: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getAllResumes(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.resumes).toHaveLength(0);
    });
  });

  describe("getResumeById", () => {
    it("should return the resume when the ID belongs to the user", async () => {
      vi.mocked(Resume.findOne).mockResolvedValue(mockResumeDoc() as any);

      const req = { user: { id: "user1" }, params: { id: "res1" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getResumeById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 404 when the resume does not exist", async () => {
      vi.mocked(Resume.findOne).mockResolvedValue(null);

      const req = { user: { id: "user1" }, params: { id: "nonexistent" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getResumeById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("createResume", () => {
    it("should create a resume with valid data and return 201", async () => {
      vi.mocked(Resume.create).mockResolvedValue(mockResumeDoc({ _id: "res1", name: "New Resume" }) as any);
      vi.mocked(Template.findOne).mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(null) } as any);

      const req = { user: { id: "user1" }, body: { name: "New Resume", templateId: "tpl1" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await createResume(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should return 401 when the user is not authenticated", async () => {
      const req = { body: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await createResume(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("updateResume", () => {
    it("should update and return the resume when valid data is provided", async () => {
      vi.mocked(Resume.findOneAndUpdate).mockResolvedValue(mockResumeDoc({ name: "Updated Resume" }) as any);
      vi.mocked(Template.findOne).mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(null) } as any);

      const req = { user: { id: "user1" }, params: { id: "res1" }, body: { name: "Updated Resume" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await updateResume(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 404 when the resume does not exist", async () => {
      vi.mocked(Resume.findOneAndUpdate).mockResolvedValue(null);

      const req = { user: { id: "user1" }, params: { id: "nonexistent" }, body: { name: "Updated Resume" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await updateResume(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("deleteResume", () => {
    it("should delete the resume and return 204", async () => {
      vi.mocked(Resume.findOneAndDelete).mockResolvedValue(mockResumeDoc() as any);

      const req = { user: { id: "user1" }, params: { id: "res1" } } as any;
      const res = { status: vi.fn().mockReturnThis(), send: vi.fn() } as any;

      await deleteResume(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("should return 404 when the resume does not exist", async () => {
      vi.mocked(Resume.findOneAndDelete).mockResolvedValue(null);

      const req = { user: { id: "user1" }, params: { id: "nonexistent" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await deleteResume(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
