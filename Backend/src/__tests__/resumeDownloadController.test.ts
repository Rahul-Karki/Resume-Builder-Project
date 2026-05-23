import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../models/Resume", () => ({
  default: Object.assign(vi.fn(), { findOne: vi.fn(), create: vi.fn() }),
}));
vi.mock("../models/ResumeDownloadJob", () => ({
  default: Object.assign(vi.fn(), { findOne: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn() }),
}));
vi.mock("../events/jobEvents", () => ({ jobEvents: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }));
vi.mock("../lib/workerShim", () => ({ processResumeDownloadJob: vi.fn() }));
vi.mock("../utils/controllerObservability", () => ({ startControllerSpan: vi.fn(() => ({})), markSpanSuccess: vi.fn(), markSpanError: vi.fn(), finishControllerSpan: vi.fn() }));
vi.mock("../utils/errorResponse", () => ({ sendErrorResponse: vi.fn((res: any, err: any) => res.status(err?.statusCode ?? 500).json({ message: err?.message ?? "Error" })) }));
vi.mock("../utils/resumeTemplate", () => ({ normalizeResumeTemplateId: vi.fn((id: any) => id) }));
vi.mock("../errors/AppError", () => ({
  AppError: class extends Error { statusCode = 500; code = "SERVER_ERROR"; constructor(m: string, o?: any) { super(m); this.statusCode = o?.statusCode ?? 500; this.code = o?.code ?? "SERVER_ERROR"; } },
  AuthError: class extends Error { statusCode = 401; code = "AUTH_REQUIRED"; constructor(m: string) { super(m); } },
  NotFoundError: class extends Error { statusCode = 404; code = "NOT_FOUND"; constructor(m: string) { super(m); } },
}));
vi.mock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { downloadResume, getResumeDownloadJobStatus, streamResumeDownloadJobEvents, downloadResumeResult } from "../controllers/resumeDownloadController";
import Resume from "../models/Resume";
import ResumeDownloadJob from "../models/ResumeDownloadJob";
import { processResumeDownloadJob } from "../lib/workerShim";

const mockLeanFindOne = (result: any) => ({ lean: vi.fn().mockResolvedValue(result) });

describe("resumeDownloadController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("downloadResume", () => {
    it("should enqueue a download job and return its ID", async () => {
      vi.mocked(Resume.findOne).mockReturnValue(mockLeanFindOne({ _id: "res1", userId: "user1", templateId: "tpl1" }) as any);
      vi.mocked(processResumeDownloadJob).mockResolvedValue(undefined);
      vi.mocked(ResumeDownloadJob.findOne).mockReturnValue(mockLeanFindOne(null) as any);
      vi.mocked(ResumeDownloadJob.findOneAndUpdate).mockResolvedValue({ jobId: "job1", status: "pending" } as any);
      vi.mocked(ResumeDownloadJob.updateOne).mockResolvedValue({ acknowledged: true } as any);

      const req = { user: { id: "user1" }, body: { resumeId: "res1" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await downloadResume(req, res);

      expect(res.status).toHaveBeenCalledWith(202);
    });

    it("should return 500 when the resume does not exist", async () => {
      vi.mocked(Resume.findOne).mockReturnValue(mockLeanFindOne(null) as any);

      const req = { user: { id: "user1" }, body: { resumeId: "bad-id" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await downloadResume(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getResumeDownloadJobStatus", () => {
    it("should return the job status when the job exists", async () => {
      vi.mocked(ResumeDownloadJob.findOne).mockReturnValue(mockLeanFindOne({ jobId: "job1", status: "completed", attemptsMade: 1, totalAttempts: 2, queuedAt: new Date(), completedAt: new Date() }) as any);

      const req = { user: { id: "user1" }, params: { id: "job1" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getResumeDownloadJobStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.status).toBe("completed");
    });

    it("should return 404 when the job ID is unknown", async () => {
      vi.mocked(ResumeDownloadJob.findOne).mockReturnValue(mockLeanFindOne(null) as any);

      const req = { user: { id: "user1" }, params: { id: "unknown" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await getResumeDownloadJobStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("streamResumeDownloadJobEvents", () => {
    it("should open an SSE connection and emit status changes", async () => {
      vi.mocked(ResumeDownloadJob.findOne).mockReturnValue(mockLeanFindOne({ jobId: "job1", status: "pending", queuedAt: new Date() }) as any);

      const req = { user: { id: "user1" }, params: { id: "job1" }, on: vi.fn() } as any;
      const res = { setHeader: vi.fn(), flushHeaders: vi.fn(), write: vi.fn(), end: vi.fn() } as any;

      await streamResumeDownloadJobEvents(req, res);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
    });
  });

  describe("downloadResumeResult", () => {
    it("should serve the PDF file when the job is completed", async () => {
      vi.mocked(ResumeDownloadJob.findOne).mockReturnValue(mockLeanFindOne({ jobId: "job1", status: "completed", fileData: Buffer.from("%PDF-data"), fileName: "resume.pdf" }) as any);

      const req = { user: { id: "user1" }, params: { id: "job1" } } as any;
      const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() } as any;

      await downloadResumeResult(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    });

    it("should return 404 when the job is not found", async () => {
      vi.mocked(ResumeDownloadJob.findOne).mockReturnValue(mockLeanFindOne(null) as any);

      const req = { user: { id: "user1" }, params: { id: "cleaned-job" } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await downloadResumeResult(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
