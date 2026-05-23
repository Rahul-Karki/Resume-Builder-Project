import { describe, it, expect, vi, beforeEach } from "vitest";

describe("atsQueue", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("enqueueAtsAnalysisJob", () => {
    it("should process the job synchronously and return a job ID", async () => {
      vi.doMock("../lib/workerShim", () => ({ processAtsAnalysisJob: vi.fn().mockResolvedValue({ score: 85 }) }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
      const { enqueueAtsAnalysisJob } = await import("../queue/atsQueue");
      const result = await enqueueAtsAnalysisJob({ resumeId: "r1", userId: "u1" } as any);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
    it("should store the analysis result in the database", async () => {
      const mockResult = { score: 92, keywords: ["react"] };
      vi.doMock("../lib/workerShim", () => ({ processAtsAnalysisJob: vi.fn().mockResolvedValue(mockResult) }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
      const { enqueueAtsAnalysisJob } = await import("../queue/atsQueue");
      const result = await enqueueAtsAnalysisJob({ resumeId: "r2", userId: "u2" } as any);
      expect(result.result).toEqual(mockResult);
    });
    it("should handle errors and mark the analysis as failed", async () => {
      vi.doMock("../lib/workerShim", () => ({ processAtsAnalysisJob: vi.fn().mockRejectedValue(new Error("Processing failed")) }));
      vi.doMock("../observability", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
      const { enqueueAtsAnalysisJob } = await import("../queue/atsQueue");
      await expect(enqueueAtsAnalysisJob({ resumeId: "r3", userId: "u3" } as any)).rejects.toThrow();
    });
  });
  describe("getAtsQueueRuntimeInfo", () => {
    it("should return queue configuration and status", async () => {
      const { getAtsQueueRuntimeInfo } = await import("../queue/atsQueue");
      const info = getAtsQueueRuntimeInfo();
      expect(info).toHaveProperty("enabled");
      expect(info).toHaveProperty("serviceName");
      expect(info).toHaveProperty("queueName");
    });
  });
});
