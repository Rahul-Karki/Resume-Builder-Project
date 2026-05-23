import { describe, it, expect, vi, beforeEach } from "vitest";

describe("resumeQueue", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("enqueueResumeDownloadJob", () => {
    it("should process the job synchronously and return a job ID", async () => {
      vi.doMock("../lib/workerShim", () => ({ processResumeDownloadJob: vi.fn().mockResolvedValue({ url: "result.pdf" }) }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
      const { enqueueResumeDownloadJob } = await import("../queue/resumeQueue");
      const result = await enqueueResumeDownloadJob({ resumeId: "r1", userId: "u1", preset: "standard" } as any);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
    it("should store the job result in the database", async () => {
      const mockResult = { url: "https://files.example.com/resume.pdf" };
      vi.doMock("../lib/workerShim", () => ({ processResumeDownloadJob: vi.fn().mockResolvedValue(mockResult) }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
      const { enqueueResumeDownloadJob } = await import("../queue/resumeQueue");
      const result = await enqueueResumeDownloadJob({ resumeId: "r2", userId: "u2", preset: "standard" } as any);
      expect(result.result).toEqual(mockResult);
    });
    it("should handle errors and mark the job as failed", async () => {
      vi.doMock("../lib/workerShim", () => ({ processResumeDownloadJob: vi.fn().mockRejectedValue(new Error("Download failed")) }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
      const { enqueueResumeDownloadJob } = await import("../queue/resumeQueue");
      await expect(enqueueResumeDownloadJob({ resumeId: "r3", userId: "u3", preset: "standard" } as any)).rejects.toThrow();
    });
  });
  describe("getResumeQueueRuntimeInfo", () => {
    it("should return queue configuration and status", async () => {
      const { getResumeQueueRuntimeInfo } = await import("../queue/resumeQueue");
      const info = getResumeQueueRuntimeInfo();
      expect(info).toHaveProperty("enabled");
      expect(info).toHaveProperty("queueName");
    });
  });
  describe("ensureResumeQueueReady", () => {
    it("should resolve without error when the queue is ready", async () => {
      const { ensureResumeQueueReady } = await import("../queue/resumeQueue");
      await expect(ensureResumeQueueReady()).resolves.toBeUndefined();
    });
  });
});
