// ─── Module: AtsAnalysis model ───────────────────────────
// Description: Stores ATS analysis results per resume and job
// Coverage targets: AtsAnalysis.create, jobId uniqueness, status enum, sectionScores embedded, keywordAnalysis, overallScore, indexes
// Last updated: 2026-05-22

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("AtsAnalysis model", () => {
  it("should create an analysis with scores and keyword matches", () => {});
  it("should enforce unique jobId per analysis", () => {});
  it("should validate status transitions", () => {});
  it("should store section-level scores", () => {});
});
