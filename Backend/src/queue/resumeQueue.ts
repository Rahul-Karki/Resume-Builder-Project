import crypto from "crypto";
import { logger } from "../observability";
import { BaseQueue } from "./baseQueue";
import type { ResumeDownloadJobData } from "../../../shared/src/jobs";
import { processResumeDownloadJob } from "../lib/workerShim";

export const createResumeDownloadJobId = (data: Record<string, unknown>) =>
  `resume-download-${String(data.resumeId ?? crypto.randomUUID())}`;

const queue = new BaseQueue<ResumeDownloadJobData>("resume-download", async (job) => {
  await processResumeDownloadJob({
    id: job.id,
    data: job.data,
    attemptsMade: job.attemptsMade,
    opts: { attempts: 3 },
  });
}, { maxConcurrency: 2, maxAttempts: 3 });

export const canAcceptJob = (): boolean => queue.activeJobCount < 2;

export const runJob = async <T>(processor: () => Promise<T>): Promise<T> => {
  return processor();
};

export const getActiveJobCount = () => queue.activeJobCount;

export const enqueueResumeDownload = async (
  jobId: string,
  data: ResumeDownloadJobData,
): Promise<void> => {
  await queue.add(jobId, data);
};

export const startResumeQueue = (): void => {
  queue.start();
  logger.info("Resume download queue started with MongoDB persistence");
};

export const stopResumeQueue = (): void => {
  queue.stop();
};

export const recoverResumeJobs = async (): Promise<number> => {
  return queue.recoverPending();
};
