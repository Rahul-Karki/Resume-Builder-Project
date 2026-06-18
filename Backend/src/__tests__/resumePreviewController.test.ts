import { describe, it, expect, vi } from "vitest";

vi.mock("../modules/export/buildResumeHtml", () => ({
  buildResumeHtml: vi.fn(() => "<html><body>Mock Resume</body></html>"),
}));

import { previewHtml } from "../controllers/resumePreviewController";
import { buildResumeHtml } from "../modules/export/buildResumeHtml";

describe("resumePreviewController", () => {
  it("should return HTML when given valid resume data", async () => {
    const req = {
      body: { resume: { title: "Test Resume" }, preset: "default" },
    } as any;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      json: vi.fn(),
    } as any;

    await previewHtml(req, res);

    expect(buildResumeHtml).toHaveBeenCalledWith({ title: "Test Resume" }, "default");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/html; charset=utf-8");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith("<html><body>Mock Resume</body></html>");
  });

  it("should handle empty body gracefully", async () => {
    const req = { body: {} } as any;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      json: vi.fn(),
    } as any;

    await previewHtml(req, res);

    expect(buildResumeHtml).toHaveBeenCalledWith({}, "default");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return 500 when buildResumeHtml throws", async () => {
    vi.mocked(buildResumeHtml).mockImplementationOnce(() => {
      throw new Error("Build failed");
    });

    const req = { body: { resume: { title: "Test" }, preset: "default" } } as any;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      json: vi.fn(),
    } as any;

    await previewHtml(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to build preview HTML" });
  });
});
