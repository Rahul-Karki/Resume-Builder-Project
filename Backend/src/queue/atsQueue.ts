import crypto from "crypto";
import { logger } from "../observability";
import { BaseQueue } from "./baseQueue";
import type { AtsAnalysisJobData } from "../../../shared/src/jobs";
import { processAtsAnalysisJob } from "../lib/workerShim";

export const createAtsAnalysisJobId = (data: Record<string, unknown>) =>
  `ats-${String(data.analysisId ?? crypto.randomUUID())}`;

const queue = new BaseQueue<AtsAnalysisJobData>("ats-analysis", async (job) => {
  await processAtsAnalysisJob({
    id: job.id,
    data: job.data,
  });
}, { maxConcurrency: 5, maxAttempts: 3 });

export const canAcceptJob = (): boolean => queue.activeJobCount < 5;

export const runJob = async <T>(processor: () => Promise<T>): Promise<T> => {
  return processor();
};

export const getActiveJobCount = () => queue.activeJobCount;

export const enqueueAtsAnalysis = async (
  analysisId: string,
  data: AtsAnalysisJobData,
): Promise<void> => {
  await queue.add(analysisId, data);
};

export const startAtsQueue = (): void => {
  queue.start();
  logger.info("ATS analysis queue started with MongoDB persistence");
};

export const stopAtsQueue = (): void => {
  queue.stop();
};

export const recoverAtsJobs = async (): Promise<number> => {
  return queue.recoverPending();
};
