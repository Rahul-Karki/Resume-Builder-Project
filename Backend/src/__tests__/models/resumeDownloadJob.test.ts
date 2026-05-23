import { describe, it, expect } from "vitest";
import ResumeDownloadJob from "../../models/ResumeDownloadJob";

describe("ResumeDownloadJob model", () => {
  it("should create a download job with status queued", () => {
    const paths = ResumeDownloadJob.schema.paths;
    expect(paths.jobId.options.required).toBe(true);
    expect(paths.jobId.options.unique).toBe(true);
    expect(paths.userId.options.required).toBe(true);
    expect(paths.status.options.required).toBe(true);
    expect(paths.status.options.default).toBe("pending");
    expect(paths.preset.options.required).toBe(true);
    expect(paths.queuedAt.options.required).toBe(true);
  });

  it("should store the generated PDF as Buffer", () => {
    const paths = ResumeDownloadJob.schema.paths;
    expect(paths.fileData).toBeDefined();
    expect(paths.fileData.options.type).toBe(Buffer);
    expect(paths.resultUrl).toBeDefined();
    expect(paths.fileName).toBeDefined();
  });

  it("should track attempt count and last error", () => {
    const paths = ResumeDownloadJob.schema.paths;
    expect(paths.attemptsMade).toBeDefined();
    expect(paths.attemptsMade.options.default).toBe(0);
    expect(paths.totalAttempts).toBeDefined();
    expect(paths.totalAttempts.options.default).toBe(5);
    expect(paths.lastError).toBeDefined();
    expect(paths.lastError.options.default).toBe("");
    expect(paths.durationMs).toBeDefined();
  });

  it("should transition through statuses", () => {
    const statusPath = ResumeDownloadJob.schema.path("status") as any;
    expect(statusPath.options.enum).toContain("pending");
    expect(statusPath.options.enum).toContain("completed");
    expect(statusPath.options.enum).toContain("failed");

    const presetPath = ResumeDownloadJob.schema.path("preset") as any;
    expect(presetPath.options.enum).toContain("web");
    expect(presetPath.options.enum).toContain("standard");
    expect(presetPath.options.enum).toContain("print");
  });
});
