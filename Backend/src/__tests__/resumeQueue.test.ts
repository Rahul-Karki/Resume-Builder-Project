import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../queue/baseQueue", () => {
  const mock = { add: vi.fn(), start: vi.fn(), stop: vi.fn(), recoverPending: vi.fn(), activeJobCount: 0 };
  mock.add.mockResolvedValue(undefined);
  mock.recoverPending.mockResolvedValue(1);
  return { BaseQueue: vi.fn(function () { return mock; }), __mockQueue: mock };
});

vi.mock("../observability", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@puppeteer/browsers", () => ({}));
vi.mock("puppeteer", () => ({ default: {} }));

vi.mock("../lib/workerShim", () => ({
  processResumeDownloadJob: vi.fn(),
}));

import { __mockQueue } from "../queue/baseQueue";
import {
  enqueueResumeDownload,
  startResumeQueue,
  stopResumeQueue,
  recoverResumeJobs,
  canAcceptJob,
  getActiveJobCount,
  createResumeDownloadJobId,
} from "../queue/resumeQueue";

describe("resumeQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __mockQueue.activeJobCount = 0;
  });

  it("should generate job ID from resumeId", () => {
    const id = createResumeDownloadJobId({ resumeId: "res-123" });
    expect(id).toBe("resume-download-res-123");
  });

  it("should generate job ID with UUID fallback", () => {
    const id = createResumeDownloadJobId({});
    expect(id).toMatch(/^resume-download-/);
  });

  it("should enqueue a resume download job", async () => {
    await enqueueResumeDownload("job-1", {
      resumeId: "res-1",
      resume: {} as any,
      preset: "default",
    });

    expect(__mockQueue.add).toHaveBeenCalledWith(
      "job-1",
      expect.objectContaining({ resumeId: "res-1", preset: "default" }),
    );
  });

  it("should start the queue", () => {
    startResumeQueue();
    expect(__mockQueue.start).toHaveBeenCalled();
  });

  it("should stop the queue", () => {
    stopResumeQueue();
    expect(__mockQueue.stop).toHaveBeenCalled();
  });

  it("should recover pending jobs", async () => {
    const count = await recoverResumeJobs();
    expect(count).toBe(1);
    expect(__mockQueue.recoverPending).toHaveBeenCalled();
  });

  it("should report whether it can accept a job", () => {
    __mockQueue.activeJobCount = 1;
    expect(canAcceptJob()).toBe(true);

    __mockQueue.activeJobCount = 2;
    expect(canAcceptJob()).toBe(false);
  });

  it("should return active job count", () => {
    __mockQueue.activeJobCount = 1;
    expect(getActiveJobCount()).toBe(1);
  });
});
