import { vi } from "vitest";

export const enqueueResumeDownloadJob = vi.fn();
export const getResumeQueueRuntimeInfo = vi.fn();
export const ensureResumeQueueReady = vi.fn();
export const closeResumeQueue = vi.fn();
export const requeueResumeDownloadJob = vi.fn();
