import crypto from "crypto";
import { QueueEvents, Worker, type Job } from "bullmq";
import { env } from "../config/env";
import connectDB from "../config/db";
import { initializeBackendSentry, captureBackendException, flushBackendSentry } from "../config/sentry";
import ResumeDownloadJob from "../models/ResumeDownloadJob";
import WorkerHeartbeat from "../models/WorkerHeartbeat";
import { logger, tracer } from "../observability";
import { recordPdfExportFailure, recordPdfExportSuccess, updatePdfExportQueue, recordPdfExportRetry } from "../utils/businessMetrics";
import { generateResumePdfArtifact } from "../services/resumeDownloadService";
import type { ResumeDownloadJobData } from "../queue/resumeQueue";
import { getBullmqConnection, getResumeQueueRuntimeInfo, resumeDownloadQueueName } from "../queue/resumeQueue";
import { SpanStatusCode } from "@opentelemetry/api";

initializeBackendSentry();

const workerId = `${env.SERVICE_NAME}-${crypto.randomUUID()}`;
const heartbeatIntervalMs = 30_000;

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

const writeHeartbeat = async (status: "starting" | "ready" | "closing" | "error", details: Record<string, unknown> = {}) => {
  const runtimeInfo = getResumeQueueRuntimeInfo();

  await WorkerHeartbeat.findOneAndUpdate(
    { workerId },
    {
      workerId,
      serviceName: env.SERVICE_NAME,
      queueName: runtimeInfo.queueName,
      queuePrefix: runtimeInfo.queuePrefix,
      status,
      lastSeenAt: new Date(),
      details: {
        ...runtimeInfo,
        concurrency: env.RESUME_DOWNLOAD_WORKER_CONCURRENCY,
        ...details,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).catch((error) => {
    logger.warn({ error, workerId, status }, "Failed to write resume worker heartbeat");
  });
};

const start = async () => {
  await connectDB();
  await writeHeartbeat("starting");

  const queueEvents = new QueueEvents(resumeDownloadQueueName, {
    connection: getBullmqConnection(),
    prefix: env.RESUME_DOWNLOAD_QUEUE_PREFIX,
  });

  const worker = new Worker<ResumeDownloadJobData>(resumeDownloadQueueName, processJob, {
    connection: getBullmqConnection(),
    prefix: env.RESUME_DOWNLOAD_QUEUE_PREFIX,
    concurrency: env.RESUME_DOWNLOAD_WORKER_CONCURRENCY,
  });

  const heartbeatTimer = setInterval(() => {
    void writeHeartbeat("ready", worker.isRunning() ? { running: true } : { running: false });
  }, heartbeatIntervalMs);

  worker.on("ready", () => {
    void writeHeartbeat("ready", { running: true });
    logger.info(getResumeQueueRuntimeInfo(), "Resume download worker connected to BullMQ");
  });

  worker.on("completed", (job) => {
    updatePdfExportQueue(-1);
    logger.info({ jobId: job.id, attemptsMade: job.attemptsMade }, "Resume download worker completed job");
  });

  worker.on("failed", (job, error) => {
    void writeHeartbeat("error", { lastError: error.message, jobId: job?.id });
    if (job) {
      logger.warn({ jobId: job.id, attemptsMade: job.attemptsMade, error }, "Resume download worker observed failed job");
    }
  });

  worker.on("error", (error) => {
    void writeHeartbeat("error", { lastError: error.message });
    logger.error({ error }, "Resume download worker error");
  });

  worker.on("stalled", (jobId) => {
    logger.warn({ jobId }, "Resume download job stalled");
  });

  queueEvents.on("waiting", ({ jobId }) => {
    logger.info({ jobId }, "Resume download job waiting");
  });

  queueEvents.on("active", ({ jobId, prev }) => {
    logger.info({ jobId, prev }, "Resume download job active");
  });

  queueEvents.on("failed", ({ jobId, failedReason, prev }) => {
    logger.warn({ jobId, failedReason, prev }, "Resume download queue event failed");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down resume download worker");
    clearInterval(heartbeatTimer);
    await writeHeartbeat("closing", { signal });
    await queueEvents.close();
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

  logger.info({ workerId, concurrency: env.RESUME_DOWNLOAD_WORKER_CONCURRENCY, ...getResumeQueueRuntimeInfo() }, "Resume download worker started");
};

void start().catch((error) => {
  logger.error({ error }, "Resume download worker failed to start");
  process.exit(1);
});
