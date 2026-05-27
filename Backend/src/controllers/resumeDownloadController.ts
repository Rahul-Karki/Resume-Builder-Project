import type { Request, Response } from "express";
import mongoose from "mongoose";
import { jobEvents } from "../events/jobEvents";
import Resume from "../models/Resume";
import ResumeDownloadJob from "../models/ResumeDownloadJob";
import { processResumeDownloadJob } from "../lib/workerShim";
import { env } from "../config/env";
import { wrapController } from "../utils/controllerWrapper";
import { logger } from "../observability";
import { sendErrorResponse } from "../utils/errorResponse";
import { normalizeResumeTemplateId } from "../utils/resumeTemplate";
import { AppError, AuthError, NotFoundError } from "../errors/AppError";
import { createResumeDownloadJobId } from "../queue/resumeQueue";
import { createResumeDownloadFileName, resolveResumeDownloadUrl } from "../../../shared/src/jobs";

type ResumeDownloadBody = {
  resumeId?: string;
  resume?: Record<string, unknown>;
  preset?: "web" | "standard" | "print";
};

const allowedPresets = new Set(["web", "standard", "print"]);
const stalePendingJobMs = env.RESUME_DOWNLOAD_STALE_PENDING_MS;

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
    if (!resume) throw new NotFoundError("Resume not found");
    return { resumeId: body.resumeId, resume: { ...resume, templateId: normalizeResumeTemplateId((resume as { templateId?: unknown }).templateId) } };
  }
  if (body.resume) {
    return { resume: { ...body.resume, templateId: normalizeResumeTemplateId(body.resume.templateId) } };
  }
  throw new AppError("Either resumeId or resume must be provided", { statusCode: 400, code: "VALIDATION_ERROR", expose: true });
};

const toBuffer = (value: unknown): Buffer | null => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ((record as any)._bsontype === "Binary") {
      if (record.buffer instanceof Uint8Array) return Buffer.from(record.buffer);
      if (Buffer.isBuffer(record.buffer)) return record.buffer;
    }
    if (Array.isArray(record.data)) return Buffer.from(record.data as number[]);
    if (record.buffer instanceof Uint8Array) return Buffer.from(record.buffer);
    if (record.buffer instanceof ArrayBuffer) return Buffer.from(record.buffer);
    if (Buffer.isBuffer(record.buffer)) return record.buffer;
    if (typeof record.data === "string") { try { return Buffer.from(record.data, "base64"); } catch { /* ignore */ } }
  }
  return null;
};

const runResumeDownloadInBackground = (job: any) => {
  void processResumeDownloadJob(job).catch((error) => {
    logger.error({ error, jobId: job?.id, userId: job?.data?.userId, resumeId: job?.data?.resumeId }, "Background resume download job failed");
  });
};

export const downloadResume = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const body = req.body as ResumeDownloadBody;
  const preset = allowedPresets.has(body.preset ?? "standard") ? (body.preset ?? "standard") : "standard";
  const snapshot = await resolveResumeSnapshot(userId, body);
  const payload = { userId, preset, ...snapshot };
  let jobId = createResumeDownloadJobId(payload);

  const existingJob = await ResumeDownloadJob.findOne({ jobId, userId }).lean();
  if (existingJob) {
    const existingQueuedAt = existingJob.queuedAt ? new Date(existingJob.queuedAt).getTime() : Date.now();
    const pendingIsStale = existingJob.status === "pending" && Date.now() - existingQueuedAt > stalePendingJobMs;

    if (existingJob.status === "pending" && !pendingIsStale) {
      logger.info({ userId, jobId, status: existingJob.status }, "Resume download request reused existing job");
      res.status(202).json({
        message: "Resume download already queued", jobId: existingJob.jobId,
        statusUrl: `/api/resumes/job-status/${encodeURIComponent(existingJob.jobId)}`,
        downloadUrl: `/api/resumes/download-result/${encodeURIComponent(existingJob.jobId)}`,
        resultUrl: existingJob.resultUrl || null, status: existingJob.status,
        lastError: existingJob.lastError || null, failedAt: existingJob.failedAt || null,
      });
      return;
    }

    if (existingJob.status === "failed" || pendingIsStale) {
      await ResumeDownloadJob.updateOne(
        { jobId, userId },
        { $set: { status: "pending", queuedAt: new Date(), resume: snapshot.resume, attemptsMade: 0, totalAttempts: env.RESUME_DOWNLOAD_JOB_ATTEMPTS, fileName: "", resultUrl: "", resultPath: "", lastError: "" }, $unset: { startedAt: "", completedAt: "", failedAt: "", fileData: "", durationMs: "" } },
      );
      try { jobEvents.emit(String(jobId), { jobId, status: "pending", queuedAt: new Date() }); } catch { /* ignore */ }
      const requeueJob = { id: jobId, data: { userId, preset, resumeId: snapshot.resumeId, resume: snapshot.resume, requestId: req.traceId ?? req.correlationId }, attemptsMade: 0, opts: { attempts: env.RESUME_DOWNLOAD_JOB_ATTEMPTS } } as any;
      runResumeDownloadInBackground(requeueJob);
      logger.info({ userId, jobId, previousStatus: existingJob.status, pendingIsStale }, "Resume download job requeued");
      res.status(202).json({
        message: existingJob.status === "failed" ? "Resume download requeued after previous failure" : "Resume download requeued after stale pending job",
        jobId, statusUrl: `/api/resumes/job-status/${encodeURIComponent(jobId)}`,
        downloadUrl: `/api/resumes/download-result/${encodeURIComponent(jobId)}`, status: "pending",
      });
      return;
    }

    const resultUrl = existingJob.resultUrl || resolveResumeDownloadUrl(existingJob.jobId);
    const responseStatus = existingJob.status === "pending" ? 202 : 200;
    logger.info({ userId, jobId, status: existingJob.status }, "Resume download request reused existing job");
    res.status(responseStatus).json({
      message: existingJob.status === "completed" ? "Resume download already completed" : "Resume download already queued",
      jobId: existingJob.jobId, statusUrl: `/api/resumes/job-status/${encodeURIComponent(existingJob.jobId)}`,
      downloadUrl: `/api/resumes/download-result/${encodeURIComponent(existingJob.jobId)}`,
      resultUrl: existingJob.status === "completed" ? resultUrl : null, status: existingJob.status,
      lastError: existingJob.lastError || null, failedAt: existingJob.failedAt || null,
    });
    return;
  }

  await ResumeDownloadJob.findOneAndUpdate(
    { jobId, userId },
    { jobId, userId, resumeId: snapshot.resumeId, resume: snapshot.resume, preset, status: "pending", queuedAt: new Date(), attemptsMade: 0, totalAttempts: env.RESUME_DOWNLOAD_JOB_ATTEMPTS, fileName: "", fileData: undefined, resultUrl: "", resultPath: "", lastError: "" },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).then((doc) => { try { if (doc) jobEvents.emit(String(jobId), { jobId, status: (doc as any).status, queuedAt: (doc as any).queuedAt }); } catch { /* best-effort */ } });

  const job = { id: jobId, data: { userId, preset, resumeId: snapshot.resumeId, resume: snapshot.resume, requestId: req.traceId ?? req.correlationId }, attemptsMade: 0, opts: { attempts: env.RESUME_DOWNLOAD_JOB_ATTEMPTS } } as any;
  runResumeDownloadInBackground(job);

  logger.info({ userId, jobId, preset, resumeId: snapshot.resumeId }, "Resume download queued for in-process background execution");
  res.status(202).json({
    message: "Resume download queued", jobId,
    statusUrl: `/api/resumes/job-status/${encodeURIComponent(jobId)}`,
    downloadUrl: `/api/resumes/download-result/${encodeURIComponent(jobId)}`, status: "pending",
  });
}, "resumeDownload.downloadResume");

export const getResumeDownloadJobStatus = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const job = await ResumeDownloadJob.findOne({ jobId: req.params.id, userId }).lean();
  if (!job) throw new NotFoundError("Job not found");

  const resultUrl = job.resultUrl || resolveResumeDownloadUrl(job.jobId);
  res.status(200).json({
    jobId: job.jobId, status: job.status, resultUrl: job.status === "completed" ? resultUrl : null,
    attemptsMade: job.attemptsMade, totalAttempts: job.totalAttempts, lastError: job.lastError || null,
    queuedAt: job.queuedAt, startedAt: job.startedAt || null, completedAt: job.completedAt || null,
    failedAt: job.failedAt || null, durationMs: job.durationMs || null,
  });
}, "resumeDownload.getResumeDownloadJobStatus");

export const cancelResumeDownload = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const jobId = String(req.params.id);
  const existing = await ResumeDownloadJob.findOne({ jobId, userId }).lean();
  if (!existing) throw new NotFoundError('Job not found');

  await ResumeDownloadJob.updateOne({ jobId, userId }, { $set: { status: 'failed', failedAt: new Date(), lastError: 'Cancelled by user' } });
  try { jobEvents.emit(String(jobId), { jobId, status: 'failed', failedAt: new Date(), lastError: 'Cancelled by user' }); } catch { /* ignore */ }
  res.status(200).json({ message: 'Job cancelled', jobId });
}, "resumeDownload.cancelResumeDownload");

export const streamResumeDownloadJobEvents = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const jobId = String(req.params.id);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (type: string, data: unknown) => { try { res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* ignore */ } };

  try {
    const job = await ResumeDownloadJob.findOne({ jobId, userId }).lean();
    if (job) send("init", { jobId: job.jobId, status: job.status, resultUrl: job.resultUrl || null, queuedAt: job.queuedAt });
  } catch { /* ignore */ }

  const listener = (payload: unknown) => { try { if (!payload || (payload as any).jobId !== jobId) return; send("update", payload); } catch { /* ignore */ } };
  jobEvents.on(jobId, listener);

  let changeStream: any | null = null;
  try {
    changeStream = (ResumeDownloadJob as any).watch([{ $match: { "fullDocument.jobId": jobId } }], { fullDocument: "updateLookup" });
    changeStream.on("change", (change: any) => { try { const doc = change.fullDocument; if (doc && doc.userId === userId) send("update", { jobId: doc.jobId, status: doc.status, resultUrl: doc.resultUrl || null, queuedAt: doc.queuedAt, startedAt: doc.startedAt || null, completedAt: doc.completedAt || null, failedAt: doc.failedAt || null, lastError: doc.lastError || null }); } catch { /* ignore */ } });
    changeStream.on("error", () => { try { changeStream.close(); } catch { /* ignore */ } });
  } catch (err) { logger.info({ error: err }, "Resume job change stream not available; SSE will still deliver in-process events"); }

  req.on("close", () => { jobEvents.off(jobId, listener); try { if (changeStream) changeStream.close(); } catch { /* ignore */ } });
}, "resumeDownload.streamResumeDownloadJobEvents");

export const downloadResumeResult = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const job = await ResumeDownloadJob.findOne({ jobId: req.params.id, userId }).lean();
  if (!job) { logger.warn({ jobId: req.params.id, userId }, "Resume download job not found in database"); throw new NotFoundError("Downloaded resume not ready"); }
  if (job.status !== "completed") { logger.warn({ jobId: req.params.id, userId, status: job.status }, "Resume download job not completed"); throw new NotFoundError("Downloaded resume not ready"); }

  const rawFileData = (job as { fileData?: unknown }).fileData;
  logger.debug({ jobId: req.params.id, fileDataType: typeof rawFileData, isBuffer: Buffer.isBuffer(rawFileData), fileDataKeys: rawFileData && typeof rawFileData === "object" ? Object.keys(rawFileData as Record<string, unknown>) : null }, "File data details");

  const buffer = toBuffer(rawFileData);
  if (!buffer) {
    logger.error({ jobId: req.params.id, userId, fileDataType: typeof rawFileData, fileDataValue: rawFileData ? JSON.stringify(rawFileData).slice(0, 200) : "null" }, "Failed to convert fileData to buffer");
    throw new NotFoundError("Downloaded resume not ready");
  }

  res.setHeader("Content-Type", "application/pdf");
  const fileName = (job as { fileName?: string }).fileName || createResumeDownloadFileName(job.jobId);
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.status(200).send(buffer);
}, "resumeDownload.downloadResumeResult");

export const getResumePreviewData = wrapController(async (req, res) => {
  const previewToken = String(req.query.previewToken ?? "");

  if (previewToken) {
    const job = await ResumeDownloadJob.findOne({ jobId: req.params.id }).lean();
    if (!job || String((job as any).previewToken ?? "") !== previewToken) throw new NotFoundError("Preview data not found");
    res.status(200).json({ resume: (job as any).resume || null });
    return;
  }

  const userId = getUserId(req, res);
  if (!userId) return;

  const job = await ResumeDownloadJob.findOne({ jobId: req.params.id, userId }).lean();
  if (!job) throw new NotFoundError("Preview data not found");

  res.status(200).json({ resume: (job as any).resume || null });
}, "resumeDownload.getResumePreviewData");
