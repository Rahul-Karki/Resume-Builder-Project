import { describe, it, expect, vi, beforeEach } from "vitest";

describe("resumeTemplate (frontend)", () => {
  it("should pass through a valid template ID", async () => {
    const { normalizeResumeTemplateId } = await import("../utils/resumeTemplate");
    expect(normalizeResumeTemplateId("classic")).toBe("classic");
    expect(normalizeResumeTemplateId("modern")).toBe("modern");
    expect(normalizeResumeTemplateId("executive")).toBe("executive");
  });
  it("should map legacy labels to current IDs", async () => {
    const { normalizeResumeTemplateId } = await import("../utils/resumeTemplate");
    expect(normalizeResumeTemplateId("classic-template")).toBe("classic");
    expect(normalizeResumeTemplateId("modern-template")).toBe("modern");
    expect(normalizeResumeTemplateId("two-column")).toBe("sidebar");
    expect(normalizeResumeTemplateId("academic")).toBe("scholarly");
  });
  it("should fall back to classic for unknown IDs", async () => {
    const { normalizeResumeTemplateId } = await import("../utils/resumeTemplate");
    expect(normalizeResumeTemplateId("nonexistent-template")).toBe("classic");
    expect(normalizeResumeTemplateId("")).toBe("classic");
    expect(normalizeResumeTemplateId(123 as any)).toBe("classic");
  });
  it("should detect tech resume templates", async () => {
    const { isTechResumeTemplate } = await import("../utils/resumeTemplate");
    expect(isTechResumeTemplate("modern")).toBe(true);
    expect(isTechResumeTemplate("sidebar")).toBe(true);
    expect(isTechResumeTemplate("classic")).toBe(false);
    expect(isTechResumeTemplate("executive")).toBe(false);
  });
});
