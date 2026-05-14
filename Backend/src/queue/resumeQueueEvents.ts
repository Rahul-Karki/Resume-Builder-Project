import { QueueEvents } from "bullmq";
import { logger } from "../observability";
import { getSharedBullmqConnection } from "./sharedConnection";
import { env } from "../config/env";
import { RESUME_DOWNLOAD_QUEUE_NAME } from "../../../shared/src/bullmq";
import { jobEvents } from "../events/jobEvents";
import ResumeDownloadJob from "../models/ResumeDownloadJob";

let queueEvents: QueueEvents | null = null;

export const initResumeQueueEvents = () => {
  if (queueEvents) return queueEvents;

  const connection = getSharedBullmqConnection();
  queueEvents = new QueueEvents(RESUME_DOWNLOAD_QUEUE_NAME, {
    connection,
    prefix: env.RESUME_DOWNLOAD_QUEUE_PREFIX,
  });

  queueEvents.on("completed", async ({ jobId, returnvalue }) => {
    try {
      const job = await ResumeDownloadJob.findOne({ jobId }).lean();
      if (job) {
        jobEvents.emit(String(jobId), { jobId, status: "completed", resultUrl: job.resultUrl || null, completedAt: job.completedAt || null });
      } else {
        jobEvents.emit(String(jobId), { jobId, status: "completed" });
      }
    } catch (err) {
      logger.warn({ err, jobId }, "Failed to fetch job document after completion");
      jobEvents.emit(String(jobId), { jobId, status: "completed" });
    }
  });

  queueEvents.on("failed", async ({ jobId, failedReason }) => {
    try {
      const job = await ResumeDownloadJob.findOne({ jobId }).lean();
      const lastError = job?.lastError ?? failedReason ?? "failed";
      jobEvents.emit(String(jobId), { jobId, status: "failed", lastError, failedAt: job?.failedAt ?? new Date() });
    } catch (err) {
      logger.warn({ err, jobId }, "Failed to fetch job document after failure");
      jobEvents.emit(String(jobId), { jobId, status: "failed", lastError: failedReason });
    }
  });

  queueEvents.on("active", async ({ jobId }) => {
    jobEvents.emit(String(jobId), { jobId, status: "active", startedAt: new Date() });
  });

  queueEvents.on("progress", async ({ jobId, data }) => {
    jobEvents.emit(String(jobId), { jobId, status: "progress", progress: data });
  });

  queueEvents.on("error", (err) => {
    logger.error({ err }, "Resume QueueEvents error");
  });

  return queueEvents;
};

export const closeResumeQueueEvents = async () => {
  if (!queueEvents) return;
  try {
    await queueEvents.close();
  } finally {
    queueEvents = null;
  }
};

export default initResumeQueueEvents;
