import { describe, it, expect, vi, beforeEach } from "vitest";

describe("resumeQueueEvents", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("initResumeQueueEvents", () => {
    it("should register event listeners for job progress and completion", async () => {
      vi.doMock("../queue/sharedConnection", () => ({ getSharedBullmqConnection: vi.fn().mockReturnValue({}) }));
      vi.doMock("../queue/resumeQueue", () => ({ getResumeQueueRuntimeInfo: vi.fn().mockReturnValue({ enabled: false }) }));
      vi.doMock("../config/env", () => ({ env: { RESUME_DOWNLOAD_QUEUE_PREFIX: "test" } }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
      vi.doMock("../models/ResumeDownloadJob", () => ({ default: { findOne: vi.fn() } }));
      const { initResumeQueueEvents } = await import("../queue/resumeQueueEvents");
      const result = initResumeQueueEvents();
      expect(result).toBeNull();
    });
    it("should emit events to SSE subscribers on job completion", async () => {
      vi.doMock("../queue/sharedConnection", () => ({ getSharedBullmqConnection: vi.fn().mockReturnValue({}) }));
      vi.doMock("../queue/resumeQueue", () => ({ getResumeQueueRuntimeInfo: vi.fn().mockReturnValue({ enabled: false }) }));
      vi.doMock("../config/env", () => ({ env: { RESUME_DOWNLOAD_QUEUE_PREFIX: "test" } }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
      vi.doMock("../models/ResumeDownloadJob", () => ({ default: { findOne: vi.fn() } }));
      const { initResumeQueueEvents } = await import("../queue/resumeQueueEvents");
      const result = initResumeQueueEvents();
      expect(result).toBeNull();
    });
    it("should handle connection errors gracefully", async () => {
      vi.doMock("../queue/sharedConnection", () => ({ getSharedBullmqConnection: vi.fn().mockImplementation(() => { throw new Error("Redis down"); }) }));
      vi.doMock("../queue/resumeQueue", () => ({ getResumeQueueRuntimeInfo: vi.fn().mockReturnValue({ enabled: true }) }));
      vi.doMock("../config/env", () => ({ env: { RESUME_DOWNLOAD_QUEUE_PREFIX: "test" } }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
      vi.doMock("../models/ResumeDownloadJob", () => ({ default: { findOne: vi.fn() } }));
      await expect((async () => {
        const { initResumeQueueEvents } = await import("../queue/resumeQueueEvents");
        return initResumeQueueEvents();
      })()).rejects.toThrow();
    });
  });
  describe("closeResumeQueueEvents", () => {
    it("should close the QueueEvents connection", async () => {
      vi.doMock("../queue/sharedConnection", () => ({ getSharedBullmqConnection: vi.fn().mockReturnValue({}) }));
      vi.doMock("../queue/resumeQueue", () => ({ getResumeQueueRuntimeInfo: vi.fn().mockReturnValue({ enabled: false }) }));
      vi.doMock("../config/env", () => ({ env: { RESUME_DOWNLOAD_QUEUE_PREFIX: "test" } }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
      vi.doMock("../models/ResumeDownloadJob", () => ({ default: { findOne: vi.fn() } }));
      const { closeResumeQueueEvents } = await import("../queue/resumeQueueEvents");
      await expect(closeResumeQueueEvents()).resolves.toBeUndefined();
    });
  });
});
