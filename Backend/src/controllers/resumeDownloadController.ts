import fs from "fs/promises";
import path from "path";
import type { Request, RequestHandler, Response } from "express";
import Resume from "../models/Resume";
import ResumeDownloadJob from "../models/ResumeDownloadJob";
import { enqueueResumeDownloadJob } from "../queue/resumeQueue";
import { env } from "../config/env";
import { finishControllerSpan, markSpanError, markSpanSuccess, startControllerSpan } from "../utils/controllerObservability";
import { logger } from "../observability";
import { sendErrorResponse } from "../utils/errorResponse";
import { normalizeResumeTemplateId } from "../utils/resumeTemplate";
import { updatePdfExportQueue } from "../utils/businessMetrics";
import { AppError, AuthError, NotFoundError } from "../errors/AppError";
import { createResumeDownloadJobId } from "../queue/resumeQueue";
import { createResumeDownloadFileName, resolveResumeDownloadUrl } from "../services/resumeDownloadService";

type ResumeDownloadBody = {
  resumeId?: string;
  resume?: Record<string, unknown>;
  preset?: "web" | "standard" | "print";
};

const allowedPresets = new Set(["web", "standard", "print"]);

const getUserId = (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    sendErrorResponse(res, new AuthError("Unauthorized", { code: "AUTH_REQUIRED" }));
    return null;
  }

  return userId;
};

const resolveResumeSnapshot = async (userId: string, body: ResumeDownloadBody) => {
  if (body.resumeId) {
    const resume = await Resume.findOne({ _id: body.resumeId, userId }).lean();

    if (!resume) {
      throw new NotFoundError("Resume not found");
    }

    return { resumeId: body.resumeId, resume: { ...resume, templateId: normalizeResumeTemplateId((resume as { templateId?: unknown }).templateId) } };
  }

  if (body.resume) {
    return {
      resume: {
        ...body.resume,
        templateId: normalizeResumeTemplateId(body.resume.templateId),
      },
    };
  }

  throw new AppError("Either resumeId or resume must be provided", {
    statusCode: 400,
    code: "VALIDATION_ERROR",
    expose: true,
  });
};

const toBuffer = (value: unknown) => {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  if (value && typeof value === "object") {
    const record = value as { data?: unknown; buffer?: unknown };

    if (Array.isArray(record.data)) {
      return Buffer.from(record.data as number[]);
    }

    if (record.buffer instanceof ArrayBuffer) {
      return Buffer.from(record.buffer);
    }
  }

  return null;
};

export const downloadResume: RequestHandler = async (req, res) => {
  const span = startControllerSpan("resumeDownload.downloadResume", req);
  let jobId = "";
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const body = req.body as ResumeDownloadBody;
    const preset = allowedPresets.has(body.preset ?? "standard") ? (body.preset ?? "standard") : "standard";
    const snapshot = await resolveResumeSnapshot(userId, body);
    const payload = {
      userId,
      preset,
      ...snapshot,
    };
    jobId = createResumeDownloadJobId(payload);
    const existingJob = await ResumeDownloadJob.findOne({ jobId, userId }).lean();

    if (existingJob) {
      const resultUrl = existingJob.resultUrl || resolveResumeDownloadUrl(existingJob.jobId, createResumeDownloadFileName(existingJob.jobId));
      const responseStatus = existingJob.status === "pending" ? 202 : 200;

      logger.info({ userId, jobId, status: existingJob.status }, "Resume download request reused existing job");
      markSpanSuccess(span);
      res.status(responseStatus).json({
        message: existingJob.status === "completed"
          ? "Resume download already completed"
          : existingJob.status === "failed"
            ? "Resume download previously failed"
            : "Resume download already queued",
        jobId: existingJob.jobId,
        statusUrl: `/api/resumes/job-status/${encodeURIComponent(existingJob.jobId)}`,
        downloadUrl: `/api/resumes/download-result/${encodeURIComponent(existingJob.jobId)}`,
        resultUrl: existingJob.status === "completed" ? resultUrl : null,
        status: existingJob.status,
      });
      return;
    }

    await ResumeDownloadJob.findOneAndUpdate(
      { jobId, userId },
      {
        jobId,
        userId,
        resumeId: snapshot.resumeId,
        preset,
        status: "pending",
        queuedAt: new Date(),
        attemptsMade: 0,
        totalAttempts: env.RESUME_DOWNLOAD_JOB_ATTEMPTS,
        fileName: "",
        fileData: undefined,
        resultUrl: "",
        resultPath: "",
        lastError: "",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await enqueueResumeDownloadJob({
      userId,
      preset,
      resumeId: snapshot.resumeId,
      resume: snapshot.resume,
      requestId: req.traceId ?? req.correlationId,
    });

    updatePdfExportQueue(1);

    logger.info({ userId, jobId, preset, resumeId: snapshot.resumeId }, "Resume download job queued");
    markSpanSuccess(span);
    res.status(202).json({
      message: "Resume download queued",
      jobId,
      statusUrl: `/api/resumes/job-status/${encodeURIComponent(jobId)}`,
      downloadUrl: `/api/resumes/download-result/${encodeURIComponent(jobId)}`,
    });
  } catch (error) {
    if (jobId) {
      await ResumeDownloadJob.updateOne(
        { jobId, userId: req.user?.id },
        {
          $set: {
            status: "failed",
            failedAt: new Date(),
            lastError: error instanceof Error ? error.message : String(error),
          },
        },
      ).catch(() => undefined);
    }

    markSpanError(span, error as Error, "Failed to queue resume download");
    logger.error({ error, resumeId: req.body?.resumeId }, "Failed to queue resume download");
    sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};

export const getResumeDownloadJobStatus: RequestHandler = async (req, res) => {
  const span = startControllerSpan("resumeDownload.getResumeDownloadJobStatus", req);
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const job = await ResumeDownloadJob.findOne({ jobId: req.params.id, userId }).lean();

    if (!job) {
      throw new NotFoundError("Job not found");
    }

    const resultUrl = job.resultUrl || resolveResumeDownloadUrl(job.jobId, createResumeDownloadFileName(job.jobId));

    markSpanSuccess(span);
    res.status(200).json({
      jobId: job.jobId,
      status: job.status,
      resultUrl: job.status === "completed" ? resultUrl : null,
      attemptsMade: job.attemptsMade,
      totalAttempts: job.totalAttempts,
      lastError: job.lastError || null,
      queuedAt: job.queuedAt,
      startedAt: job.startedAt || null,
      completedAt: job.completedAt || null,
      failedAt: job.failedAt || null,
      durationMs: job.durationMs || null,
    });
  } catch (error) {
    markSpanError(span, error as Error, "Failed to fetch job status");
    logger.error({ error, jobId: req.params.id }, "Failed to fetch job status");
    sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};

export const downloadResumeResult: RequestHandler = async (req, res) => {
  const span = startControllerSpan("resumeDownload.downloadResumeResult", req);
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const job = await ResumeDownloadJob.findOne({ jobId: req.params.id, userId }).lean();

    if (!job || job.status !== "completed") {
      throw new NotFoundError("Downloaded resume not ready");
    }

    const buffer = toBuffer((job as { fileData?: unknown }).fileData);

    if (buffer) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${(job as { fileName?: string }).fileName || `${job.jobId}.pdf`}"`);
      res.status(200).send(buffer);
      markSpanSuccess(span);
      return;
    }

    if (!job.resultPath) {
      throw new NotFoundError("Downloaded resume not ready");
    }

    const absolutePath = path.isAbsolute(job.resultPath)
      ? job.resultPath
      : path.join(process.cwd(), job.resultPath);

    await fs.access(absolutePath);
    res.download(absolutePath, `${job.jobId}.pdf`);
    markSpanSuccess(span);
  } catch (error) {
    markSpanError(span, error as Error, "Failed to download resume result");
    logger.error({ error, jobId: req.params.id }, "Failed to download resume result");
    sendErrorResponse(res, error, { statusCode: 404, code: "NOT_FOUND", message: "Downloaded resume not found" });
  } finally {
    finishControllerSpan(span);
  }
};