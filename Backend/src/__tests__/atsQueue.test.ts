import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../queue/baseQueue", () => {
  const mock = { add: vi.fn(), start: vi.fn(), stop: vi.fn(), recoverPending: vi.fn(), activeJobCount: 0 };
  mock.add.mockResolvedValue(undefined);
  mock.recoverPending.mockResolvedValue(3);
  return { BaseQueue: vi.fn(function () { return mock; }), __mockQueue: mock };
});

vi.mock("../observability", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../lib/workerShim", () => ({
  processAtsAnalysisJob: vi.fn(),
}));

import { __mockQueue } from "../queue/baseQueue";
import {
  enqueueAtsAnalysis,
  startAtsQueue,
  stopAtsQueue,
  recoverAtsJobs,
  canAcceptJob,
  getActiveJobCount,
  createAtsAnalysisJobId,
} from "../queue/atsQueue";

describe("atsQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __mockQueue.activeJobCount = 0;
  });

  it("should generate job ID from analysisId", () => {
    const id = createAtsAnalysisJobId({ analysisId: "abc-123" });
    expect(id).toBe("ats-abc-123");
  });

  it("should generate job ID with UUID fallback", () => {
    const id = createAtsAnalysisJobId({});
    expect(id).toMatch(/^ats-/);
  });

  it("should enqueue an ATS analysis job", async () => {
    await enqueueAtsAnalysis("analysis-1", {
      resumeId: "res-1",
      userId: "user-1",
      analysisId: "analysis-1",
      resume: {} as any,
      keywords: [],
      jobTitle: "Engineer",
      jobDescription: "",
      reportType: "resume-analysis",
      previousOverallScore: undefined,
    });

    expect(__mockQueue.add).toHaveBeenCalledWith(
      "analysis-1",
      expect.objectContaining({ resumeId: "res-1", analysisId: "analysis-1" }),
    );
  });

  it("should start the queue", () => {
    startAtsQueue();
    expect(__mockQueue.start).toHaveBeenCalled();
  });

  it("should stop the queue", () => {
    stopAtsQueue();
    expect(__mockQueue.stop).toHaveBeenCalled();
  });

  it("should recover pending jobs", async () => {
    const count = await recoverAtsJobs();
    expect(count).toBe(3);
    expect(__mockQueue.recoverPending).toHaveBeenCalled();
  });

  it("should report whether it can accept a job based on concurrency", () => {
    __mockQueue.activeJobCount = 2;
    expect(canAcceptJob()).toBe(true);

    __mockQueue.activeJobCount = 5;
    expect(canAcceptJob()).toBe(false);
  });

  it("should return the active job count", () => {
    __mockQueue.activeJobCount = 3;
    expect(getActiveJobCount()).toBe(3);
  });
});
