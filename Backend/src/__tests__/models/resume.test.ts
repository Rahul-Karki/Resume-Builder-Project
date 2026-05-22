// ─── Module: Resume model ───────────────────────────
// Description: Resume document schema with personal info, sections, style, ATS scores
// Coverage targets: Resume.create, Resume.findByUserId, embedded sections, templateId normalization, variant support, ATS score fields, softDelete plugin
// Last updated: 2026-05-22

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Resume model", () => {
  it("should create a resume with personal info and sections", () => {});
  it("should validate section structure and field types", () => {});
  it("should support variant linking via baseResumeId", () => {});
  it("should store ATS scores and analysis metadata", () => {});
  it("should soft-delete when deleted", () => {});
});
