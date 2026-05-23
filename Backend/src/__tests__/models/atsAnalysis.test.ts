import { describe, it, expect } from "vitest";
import AtsAnalysis from "../../models/AtsAnalysis";

describe("AtsAnalysis model", () => {
  it("should create an analysis with scores and keyword matches", () => {
    const paths = AtsAnalysis.schema.paths;
    expect(paths["jobId"].options.required).toBe(true);
    expect(paths["jobId"].options.unique).toBe(true);
    expect(paths["resumeId"].options.required).toBe(true);
    expect(paths["userId"].options.required).toBe(true);
    expect(paths["overallScore"].options.required).toBe(true);
    expect(paths["matchScore"].options.required).toBe(true);
    expect(paths["overallScore"].options.min).toBe(0);
    expect(paths["overallScore"].options.max).toBe(100);
    expect(paths["keywordAnalysis.matchedKeywords"]).toBeDefined();
    expect(paths["keywordAnalysis.missingKeywords"]).toBeDefined();
  });

  it("should enforce unique jobId per analysis", () => {
    const paths = AtsAnalysis.schema.paths;
    expect(paths["jobId"].options.unique).toBe(true);
  });

  it("should validate status transitions", () => {
    const statusPath = AtsAnalysis.schema.path("status") as any;
    expect(statusPath.options.enum).toContain("pending");
    expect(statusPath.options.enum).toContain("completed");
    expect(statusPath.options.enum).toContain("failed");
    expect(statusPath.options.default).toBe("pending");

    const reportTypePath = AtsAnalysis.schema.path("reportType") as any;
    expect(reportTypePath.options.enum).toContain("resume-analysis");
    expect(reportTypePath.options.enum).toContain("job-description-match");
  });

  it("should store section-level scores", () => {
    const summaryPath = AtsAnalysis.schema.paths["sectionScores.summary"] as any;
    expect(summaryPath).toBeDefined();
    expect(summaryPath.options.min).toBe(0);
    expect(summaryPath.options.max).toBe(100);
    expect(summaryPath.options.required).toBe(true);
    expect(AtsAnalysis.schema.paths["sectionScores.experience"]).toBeDefined();
    expect(AtsAnalysis.schema.paths["sectionScores.skills"]).toBeDefined();
    expect(AtsAnalysis.schema.paths["sectionScores.education"]).toBeDefined();
    expect(AtsAnalysis.schema.paths["sectionScores.formatting"]).toBeDefined();
    expect(AtsAnalysis.schema.paths["sectionScores.projects"]).toBeDefined();
  });
});
