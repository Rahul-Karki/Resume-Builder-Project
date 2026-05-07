import { Worker, type Job } from "bullmq";
import { env } from "../config/env";
import connectDB from "../config/db";
import { initializeBackendSentry, captureBackendException, flushBackendSentry } from "../config/sentry";
import ResumeDownloadJob from "../models/ResumeDownloadJob";
import { logger, tracer } from "../observability";
import { recordPdfExportFailure, recordPdfExportSuccess, updatePdfExportQueue, recordPdfExportRetry } from "../utils/businessMetrics";
import { generateResumePdfArtifact } from "../services/resumeDownloadService";
import type { ResumeDownloadJobData } from "../queue/resumeQueue";
import { SpanStatusCode } from "@opentelemetry/api";

initializeBackendSentry();

const getBullmqConnection = () => {
  const redisUrl = env.BULLMQ_REDIS_URL || env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("BULLMQ_REDIS_URL or REDIS_URL must be configured for resume downloads");
  }

  if (redisUrl === "/") {
    throw new Error("Invalid BullMQ Redis URL: '/' is not a valid Redis connection string. Set BULLMQ_REDIS_URL or REDIS_URL to a real Redis URL like redis://host:6379/0");
  }

  try {
    const parsed = new URL(redisUrl);
    if (!parsed.protocol.startsWith("redis")) {
      throw new Error("Redis URL must use redis://, rediss://, or a supported Redis endpoint");
    }
  } catch (error) {
    throw new Error(`Invalid BullMQ Redis URL: ${redisUrl}. ${(error as Error).message}`);
  }

  return {
    url: redisUrl,
    connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectionName: `${env.SERVICE_NAME}-resume-download-worker`,
  };
};

const updateJobRecord = async (jobId: string, updates: Record<string, unknown>) => {
  await ResumeDownloadJob.updateOne({ jobId }, { $set: updates }).catch((error) => {
    logger.warn({ error, jobId }, "Failed to update resume download job record");
  });
};

const processJob = async (job: Job<ResumeDownloadJobData>) => {
  const startedAt = Date.now();
  const trace = tracer.startSpan("resumeDownload.processJob");
  const attemptNumber = job.attemptsMade + 1;

  try {
    logger.info({ jobId: job.id, attemptNumber, preset: job.data.preset, resumeId: job.data.resumeId }, "Resume download job started");

    await updateJobRecord(job.id!, {
      status: "pending",
      startedAt: new Date(),
      attemptsMade: job.attemptsMade,
      totalAttempts: job.opts.attempts ?? env.RESUME_DOWNLOAD_JOB_ATTEMPTS,
    });

    const artifact = await generateResumePdfArtifact(job.data.resume, job.data.preset, job.id!);

    await updateJobRecord(job.id!, {
      status: "completed",
      resultUrl: artifact.resultUrl,
      fileName: artifact.fileName,
      fileData: artifact.pdfBuffer,
      attemptsMade: attemptNumber,
      completedAt: new Date(),
      durationMs: Date.now() - startedAt,
      lastError: "",
    });

    recordPdfExportSuccess(Date.now() - startedAt, job.data.preset);
    logger.info({ jobId: job.id, durationMs: Date.now() - startedAt, resultUrl: artifact.resultUrl }, "Resume download job completed");
    return { resultUrl: artifact.resultUrl };
  } catch (error) {
    const finalFailure = attemptNumber >= (job.opts.attempts ?? env.RESUME_DOWNLOAD_JOB_ATTEMPTS);
    const errorMessage = error instanceof Error ? error.message : String(error);

    await updateJobRecord(job.id!, {
      status: finalFailure ? "failed" : "pending",
      attemptsMade: attemptNumber,
      failedAt: finalFailure ? new Date() : undefined,
      lastError: errorMessage,
      durationMs: Date.now() - startedAt,
    });

    if (!finalFailure) {
      // Job will be retried by BullMQ; record a retry metric
      recordPdfExportRetry(errorMessage);
    } else {
      recordPdfExportFailure(errorMessage);
    }
    logger.error({ error, jobId: job.id, attemptNumber, finalFailure }, "Resume download job failed");
    captureBackendException(error, undefined);
    trace.recordException(error instanceof Error ? error : new Error(errorMessage));
    trace.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });

    if (finalFailure) {
      updatePdfExportQueue(-1);
    }

    throw error;
  } finally {
    trace.end();
  }
};

const start = async () => {
  await connectDB();

  const worker = new Worker<ResumeDownloadJobData>("resumeQueue", processJob, {
    connection: getBullmqConnection(),
    prefix: env.RESUME_DOWNLOAD_QUEUE_PREFIX,
    concurrency: env.RESUME_DOWNLOAD_WORKER_CONCURRENCY,
  });

  worker.on("completed", (job) => {
    updatePdfExportQueue(-1);
    logger.info({ jobId: job.id, attemptsMade: job.attemptsMade }, "Resume download worker completed job");
  });

  worker.on("failed", (job, error) => {
    if (job) {
      logger.warn({ jobId: job.id, attemptsMade: job.attemptsMade, error }, "Resume download worker observed failed job");
    }
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down resume download worker");
    await worker.close();
    await flushBackendSentry();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  logger.info({ concurrency: env.RESUME_DOWNLOAD_WORKER_CONCURRENCY }, "Resume download worker started");
};

void start().catch((error) => {
  logger.error({ error }, "Resume download worker failed to start");
  process.exit(1);
});