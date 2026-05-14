import type { Request, RequestHandler, Response } from "express";
import mongoose from "mongoose";
import { jobEvents } from "../events/jobEvents";
import Resume from "../models/Resume";
import ResumeDownloadJob from "../models/ResumeDownloadJob";
import { getResumeQueue } from "../queue/resumeQueue";
import { processResumeDownloadJob } from "../lib/workerShim";
import { env } from "../config/env";
import { finishControllerSpan, markSpanError, markSpanSuccess, startControllerSpan } from "../utils/controllerObservability";
import { logger } from "../observability";
import { sendErrorResponse } from "../utils/errorResponse";
import { normalizeResumeTemplateId } from "../utils/resumeTemplate";
import { AppError, AuthError, NotFoundError } from "../errors/AppError";
import { createResumeDownloadJobId } from "../queue/resumeQueue";
import { createResumeDownloadFileName, resolveResumeDownloadUrl } from "../../../shared/src/bullmq";

type ResumeDownloadBody = {
  resumeId?: string;
  resume?: Record<string, unknown>;
  preset?: "web" | "standard" | "print";
};

const allowedPresets = new Set(["web", "standard", "print"]);
const stalePendingJobMs = env.RESUME_DOWNLOAD_STALE_PENDING_MS;
const QUEUE_COUNTS_CACHE_TTL_MS = 10_000;

let cachedQueueCounts: Record<string, number> | null = null;
let cachedQueueCountsAt = 0;

// jobEvents imported from centralized emitter

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

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    // Handle MongoDB Binary BSON type: { type: 0, data: [...] }
    if (Array.isArray(record.data)) {
      return Buffer.from(record.data as number[]);
    }

    // Handle nested buffer objects
    if (record.buffer instanceof ArrayBuffer) {
      return Buffer.from(record.buffer);
    }

    if (Buffer.isBuffer(record.buffer)) {
      return record.buffer;
    }

    // Handle string base64 encoding
    if (typeof record.data === "string") {
      try {
        return Buffer.from(record.data, "base64");
      } catch {
        // Ignore conversion errors
      }
    }
  }

  return null;
};

// The worker service owns PDF rendering; the API only tracks job state and returns queue metadata.

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
      const existingQueuedAt = existingJob.queuedAt ? new Date(existingJob.queuedAt).getTime() : Date.now();
      const pendingIsStale = existingJob.status === "pending" && Date.now() - existingQueuedAt > stalePendingJobMs;

      if (existingJob.status === "pending" && !pendingIsStale) {
        logger.info({ userId, jobId, status: existingJob.status }, "Resume download request reused existing job");
        markSpanSuccess(span);
        res.status(202).json({
          message: "Resume download already queued",
          jobId: existingJob.jobId,
          statusUrl: `/api/resumes/job-status/${encodeURIComponent(existingJob.jobId)}`,
          downloadUrl: `/api/resumes/download-result/${encodeURIComponent(existingJob.jobId)}`,
          resultUrl: existingJob.resultUrl || null,
          status: existingJob.status,
          lastError: existingJob.lastError || null,
          failedAt: existingJob.failedAt || null,
        });
        return;
      }

      if (existingJob.status === "failed" || pendingIsStale) {
        await ResumeDownloadJob.updateOne(
          { jobId, userId },
          {
            $set: {
              status: "pending",
              queuedAt: new Date(),
              attemptsMade: 0,
              totalAttempts: env.RESUME_DOWNLOAD_JOB_ATTEMPTS,
              fileName: "",
              resultUrl: "",
              resultPath: "",
              lastError: "",
            },
            $unset: {
              startedAt: "",
              completedAt: "",
              failedAt: "",
              fileData: "",
              durationMs: "",
            },
          },
        );

        // Emit pending event to any in-process listeners (best-effort)
        try {
          jobEvents.emit(String(jobId), { jobId, status: "pending", queuedAt: new Date() });
        } catch {
          // ignore
        }

        // Run resume PDF generation synchronously (no BullMQ)
        const requeueJob = {
          id: jobId,
          data: {
            userId,
            preset,
            resumeId: snapshot.resumeId,
            resume: snapshot.resume,
            requestId: req.traceId ?? req.correlationId,
          },
          attemptsMade: 0,
          opts: { attempts: env.RESUME_DOWNLOAD_JOB_ATTEMPTS },
        } as any;

        await processResumeDownloadJob(requeueJob as any);

        logger.info(
          { userId, jobId, previousStatus: existingJob.status, pendingIsStale },
          "Resume download job requeued",
        );
        markSpanSuccess(span);
        res.status(202).json({
          message: existingJob.status === "failed"
            ? "Resume download requeued after previous failure"
            : "Resume download requeued after stale pending job",
          jobId,
          statusUrl: `/api/resumes/job-status/${encodeURIComponent(jobId)}`,
          downloadUrl: `/api/resumes/download-result/${encodeURIComponent(jobId)}`,
          status: "pending",
        });
        return;
      }

      const resultUrl = existingJob.resultUrl || resolveResumeDownloadUrl(existingJob.jobId);
      const responseStatus = existingJob.status === "pending" ? 202 : 200;

      logger.info({ userId, jobId, status: existingJob.status }, "Resume download request reused existing job");
      markSpanSuccess(span);
      res.status(responseStatus).json({
        message: existingJob.status === "completed"
          ? "Resume download already completed"
          : "Resume download already queued",
        jobId: existingJob.jobId,
        statusUrl: `/api/resumes/job-status/${encodeURIComponent(existingJob.jobId)}`,
        downloadUrl: `/api/resumes/download-result/${encodeURIComponent(existingJob.jobId)}`,
        resultUrl: existingJob.status === "completed" ? resultUrl : null,
        status: existingJob.status,
        lastError: existingJob.lastError || null,
        failedAt: existingJob.failedAt || null,
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
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).then((doc) => {
      try {
        if (doc) jobEvents.emit(String(jobId), { jobId, status: (doc as any).status, queuedAt: (doc as any).queuedAt });
      } catch {
        // best-effort emit
      }
    });

    // Process resume download synchronously
    const job = {
      id: jobId,
      data: {
        userId,
        preset,
        resumeId: snapshot.resumeId,
        resume: snapshot.resume,
        requestId: req.traceId ?? req.correlationId,
      },
      attemptsMade: 0,
      opts: { attempts: env.RESUME_DOWNLOAD_JOB_ATTEMPTS },
    } as any;

    await processResumeDownloadJob(job as any);

    logger.info({ userId, jobId, preset, resumeId: snapshot.resumeId }, "Resume download completed (synchronous)");
    markSpanSuccess(span);
    res.status(200).json({
      message: "Resume download completed",
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
      try {
        jobEvents.emit(String(jobId), { jobId, status: "failed", failedAt: new Date(), lastError: error instanceof Error ? error.message : String(error) });
      } catch {
        // ignore
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    markSpanError(span, error as Error, "Failed to queue resume download");
    logger.error(
      { error, errorMessage, errorStack, resumeId: req.body?.resumeId, jobId, userId: req.user?.id },
      "Failed to queue resume download",
    );
    const isRedisError = error instanceof Error && (
      /max requests limit exceeded/i.test(error.message) ||
      /redis/i.test(error.message) ||
      /econnrefused/i.test(error.message) ||
      /closed/i.test(error.message)
    );
    const statusCode = isRedisError ? 503 : 500;
    const code = isRedisError ? "SERVICE_UNAVAILABLE" : "SERVER_ERROR";
    const message = isRedisError ? "PDF generation is temporarily unavailable due to high load. Please try again later." : "Server error";

    sendErrorResponse(res, error, { statusCode, code, message });
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

    const resultUrl = job.resultUrl || resolveResumeDownloadUrl(job.jobId);

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

export const streamResumeDownloadJobEvents: RequestHandler = async (req, res) => {
  const span = startControllerSpan("resumeDownload.streamResumeDownloadJobEvents", req);
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const jobId = String(req.params.id);

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    // Helper to send event
    const send = (type: string, data: unknown) => {
      try {
        res.write(`event: ${type}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        // ignore write errors
      }
    };

    // Send initial state
    try {
      const job = await ResumeDownloadJob.findOne({ jobId, userId }).lean();
      if (job) send("init", { jobId: job.jobId, status: job.status, resultUrl: job.resultUrl || null, queuedAt: job.queuedAt });
    } catch (err) {
      // ignore
    }

    // Listen for in-process events
    const listener = (payload: unknown) => {
      // Ensure we only forward events for this jobId
      try {
        if (!payload || (payload as any).jobId !== jobId) return;
        send("update", payload);
      } catch {
        // ignore
      }
    };

    jobEvents.on(jobId, listener);

    // Try to open a change stream for cross-process updates
    let changeStream: any | null = null;
    try {
      const pipeline = [
        { $match: { "fullDocument.jobId": jobId } },
      ];
      changeStream = (ResumeDownloadJob as any).watch(pipeline, { fullDocument: "updateLookup" });
      changeStream.on("change", (change: any) => {
        try {
          const doc = change.fullDocument;
          if (doc && doc.userId === userId) {
            send("update", { jobId: doc.jobId, status: doc.status, resultUrl: doc.resultUrl || null, queuedAt: doc.queuedAt, startedAt: doc.startedAt || null, completedAt: doc.completedAt || null, failedAt: doc.failedAt || null, lastError: doc.lastError || null });
          }
        } catch {
          // ignore
        }
      });
    } catch (err) {
      logger.info({ error: err }, "Resume job change stream not available; SSE will still deliver in-process events");
    }

    req.on("close", () => {
      jobEvents.off(jobId, listener);
      try { if (changeStream) changeStream.close(); } catch { /* ignore */ }
    });

    markSpanSuccess(span);
  } catch (error) {
    markSpanError(span, error as Error, "Failed to stream job events");
    logger.error({ error, jobId: req.params.id }, "Failed to stream resume job events");
    try { res.end(); } catch { /* ignore */ }
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

    if (!job) {
      logger.warn({ jobId: req.params.id, userId }, "Resume download job not found in database");
      throw new NotFoundError("Downloaded resume not ready");
    }

    if (job.status !== "completed") {
      logger.warn({ jobId: req.params.id, userId, status: job.status }, "Resume download job not completed");
      throw new NotFoundError("Downloaded resume not ready");
    }

    const rawFileData = (job as { fileData?: unknown }).fileData;
    logger.debug({
      jobId: req.params.id,
      fileDataType: typeof rawFileData,
      isBuffer: Buffer.isBuffer(rawFileData),
      fileDataKeys: rawFileData && typeof rawFileData === "object" ? Object.keys(rawFileData as Record<string, unknown>) : null,
    }, "File data details");

    const buffer = toBuffer(rawFileData);

    if (!buffer) {
      logger.error({
        jobId: req.params.id,
        userId,
        fileDataType: typeof rawFileData,
        fileDataValue: rawFileData ? JSON.stringify(rawFileData).slice(0, 200) : "null",
      }, "Failed to convert fileData to buffer");
      throw new NotFoundError("Downloaded resume not ready");
    }

    res.setHeader("Content-Type", "application/pdf");
    // Always use "inline" for PDF files so browser's native PDF viewer activates
    // User controls save location via browser's native PDF viewer
    // (clicking "Save" button in PDF viewer opens save dialog)
    const fileName = (job as { fileName?: string }).fileName || createResumeDownloadFileName(job.jobId);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.status(200).send(buffer);
    markSpanSuccess(span);
  } catch (error) {
    markSpanError(span, error as Error, "Failed to download resume result");
    logger.error({ error, jobId: req.params.id }, "Failed to download resume result");
    sendErrorResponse(res, error, { statusCode: 404, code: "NOT_FOUND", message: "Downloaded resume not found" });
  } finally {
    finishControllerSpan(span);
  }
};

export const getResumePreviewData: RequestHandler = async (req, res) => {
  const span = startControllerSpan("resumeDownload.getResumePreviewData", req);
  try {
    const previewToken = String(req.query.previewToken ?? "");

    // If previewToken provided we allow unauthenticated access (token must match job.previewToken).
    if (previewToken) {
      const job = await ResumeDownloadJob.findOne({ jobId: req.params.id }).lean();
      if (!job || String((job as any).previewToken ?? "") !== previewToken) {
        throw new NotFoundError("Preview data not found");
      }

      const resumeSnapshot = (job as any).resume || null;
      markSpanSuccess(span);
      res.status(200).json({ resume: resumeSnapshot });
      return;
    }

    // otherwise require authentication and ownership
    const userId = getUserId(req, res);
    if (!userId) return;

    const job = await ResumeDownloadJob.findOne({ jobId: req.params.id, userId }).lean();
    if (!job) {
      throw new NotFoundError("Preview data not found");
    }

    const resumeSnapshot = (job as any).resume || null;

    markSpanSuccess(span);
    res.status(200).json({ resume: resumeSnapshot });
  } catch (error) {
    markSpanError(span, error as Error, "Failed to fetch resume preview data");
    logger.error({ error, jobId: req.params.id }, "Failed to fetch resume preview data");
    sendErrorResponse(res, error, { statusCode: 404, code: "NOT_FOUND", message: "Preview data not found" });
  } finally {
    finishControllerSpan(span);
  }
};

export const getResumeQueueMetrics: RequestHandler = async (req, res) => {
  const span = startControllerSpan("resumeDownload.getResumeQueueMetrics", req);
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const queue = getResumeQueue();
    const now = Date.now();
    const queueCounts = cachedQueueCounts && now - cachedQueueCountsAt < QUEUE_COUNTS_CACHE_TTL_MS
      ? cachedQueueCounts
      : await queue.getJobCounts().then((counts) => {
          cachedQueueCounts = counts;
          cachedQueueCountsAt = now;
          return counts;
        });

    const agg = await ResumeDownloadJob.aggregate([
      { $match: { userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).exec();

    const dbCounts: Record<string, number> = {};
    for (const row of agg) {
      dbCounts[row._id] = row.count;
    }

    markSpanSuccess(span);
    res.status(200).json({ queueCounts, dbCounts });
  } catch (error) {
    markSpanError(span, error as Error, "Failed to fetch queue metrics");
    logger.error({ error }, "Failed to fetch resume queue metrics");
    sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};
