import crypto from "crypto";
import { logger } from "../observability";

export const createResumeDownloadJobId = (data: Record<string, unknown>) =>
  `resume-download-${String(data.resumeId ?? crypto.randomUUID())}`;

let activeJobCount = 0;
const MAX_CONCURRENT = 5;

export const canAcceptJob = (): boolean => activeJobCount < MAX_CONCURRENT;

export const runJob = async <T>(processor: () => Promise<T>): Promise<T> => {
  if (activeJobCount >= MAX_CONCURRENT) {
    logger.warn({ activeJobCount }, "Resume download queue at capacity");
  }
  activeJobCount++;
  try {
    return await processor();
  } finally {
    activeJobCount--;
  }
};

export const getActiveJobCount = () => activeJobCount;
