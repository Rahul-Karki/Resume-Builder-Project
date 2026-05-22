import { vi } from "vitest";

export const enqueueAtsAnalysisJob = vi.fn();
export const getAtsQueueRuntimeInfo = vi.fn();
export const ensureAtsQueueReady = vi.fn();
export const closeAtsQueue = vi.fn();
export const requeueAtsAnalysisJob = vi.fn();
