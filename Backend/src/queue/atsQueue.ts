import crypto from "crypto";
import { logger } from "../observability";

export const createAtsAnalysisJobId = (data: Record<string, unknown>) =>
  `ats-${String(data.analysisId ?? crypto.randomUUID())}`;

let activeJobCount = 0;
const MAX_CONCURRENT = 5;

export const canAcceptJob = (): boolean => activeJobCount < MAX_CONCURRENT;

export const runJob = async <T>(processor: () => Promise<T>): Promise<T> => {
  if (activeJobCount >= MAX_CONCURRENT) {
    logger.warn({ activeJobCount }, "ATS analysis queue at capacity");
  }
  activeJobCount++;
  try {
    return await processor();
  } finally {
    activeJobCount--;
  }
};

export const getActiveJobCount = () => activeJobCount;
