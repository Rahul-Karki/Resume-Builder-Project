import { describe, it, expect, vi } from "vitest";
import { isTechResumeTemplate, normalizeResumeTemplateId } from "../utils/resumeTemplate";

vi.mock("@/data/templateMeta", () => ({
  templates: [
    { id: "classic", category: "non-tech" },
    { id: "executive", category: "non-tech" },
    { id: "modern", category: "tech" },
    { id: "compact", category: "non-tech" },
    { id: "sidebar", category: "tech" },
    { id: "scholarly", category: "non-tech" },
    { id: "research", category: "non-tech" },
    { id: "chronological", category: "non-tech" },
    { id: "functional", category: "non-tech" },
    { id: "combination", category: "non-tech" },
    { id: "traditional-assistant", category: "non-tech" },
    { id: "community-impact", category: "non-tech" },
  ],
}));

describe("resumeTemplate (frontend)", () => {
  it("should pass through a valid template ID", () => {
    expect(normalizeResumeTemplateId("classic")).toBe("classic");
    expect(normalizeResumeTemplateId("modern")).toBe("modern");
    expect(normalizeResumeTemplateId("executive")).toBe("executive");
  });
  it("should map legacy labels to current IDs", () => {
    expect(normalizeResumeTemplateId("classic-template")).toBe("classic");
    expect(normalizeResumeTemplateId("modern-template")).toBe("modern");
    expect(normalizeResumeTemplateId("two-column")).toBe("sidebar");
    expect(normalizeResumeTemplateId("academic")).toBe("scholarly");
  });
  it("should fall back to classic for unknown IDs", () => {
    expect(normalizeResumeTemplateId("nonexistent-template")).toBe("classic");
    expect(normalizeResumeTemplateId("")).toBe("classic");
    expect(normalizeResumeTemplateId(123 as any)).toBe("classic");
  });
  it("should detect tech resume templates", () => {
    expect(isTechResumeTemplate("modern")).toBe(true);
    expect(isTechResumeTemplate("sidebar")).toBe(true);
    expect(isTechResumeTemplate("classic")).toBe(false);
    expect(isTechResumeTemplate("executive")).toBe(false);
  });
});
