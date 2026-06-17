import { describe, it, expect, vi, beforeEach } from "vitest";

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
vi.mock("@/store/templateConfig", () => ({
  resolveTemplateCategory: vi.fn(() => "non-tech"),
  resolveTemplateConfig: vi.fn(() => ({ templateId: "classic", templateCategory: "non-tech", style: {}, sectionVisibility: {} })),
  mergeTemplateVisibilityForExistingResume: vi.fn(() => ({})),
}));
vi.mock("@/services/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

describe("normalizeResume", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should normalize resume from API response", async () => {
    const { normalizeResumeFromApi } = await import("../utils/normalizeResume");
    const result = normalizeResumeFromApi({ templateId: "modern", personalInfo: { name: "John" } }, "fallback-1");
    expect(result.templateId).toBe("modern");
    expect(result.personalInfo.name).toBe("John");
    expect(result.id).toBe("fallback-1");
  });

  it("should use _id from API response", async () => {
    const { normalizeResumeFromApi } = await import("../utils/normalizeResume");
    const result = normalizeResumeFromApi({ _id: "api-123" }, "fallback-1");
    expect(result.id).toBe("api-123");
  });

  it("should normalize sections with defaults", async () => {
    const { normalizeResumeFromApi } = await import("../utils/normalizeResume");
    const result = normalizeResumeFromApi({}, "fallback");
    expect(Array.isArray(result.sections.experience)).toBe(true);
    expect(Array.isArray(result.sections.education)).toBe(true);
    expect(Array.isArray(result.sections.skills)).toBe(true);
  });

  it("should normalize experience entries with defaults", async () => {
    const { normalizeResumeFromApi } = await import("../utils/normalizeResume");
    const result = normalizeResumeFromApi({ sections: { experience: [{ company: "Acme" }] } }, "fallback");
    expect(result.sections.experience[0].contentMode).toBe("bullets");
    expect(result.sections.experience[0].description).toBe("");
  });

  it("should normalize preloaded resume", async () => {
    const { normalizeResumeFromPreloaded } = await import("../utils/normalizeResume");
    const result = normalizeResumeFromPreloaded({ templateId: "executive", personalInfo: { name: "Jane" } } as any, "fallback");
    expect(result.templateId).toBe("executive");
    expect(result.personalInfo.name).toBe("Jane");
  });

  it("should handle invalid template ID", async () => {
    const { normalizeResumeFromApi } = await import("../utils/normalizeResume");
    const result = normalizeResumeFromApi({ templateId: "" }, "fallback-1");
    expect(result.templateId).toBe("classic");
  });

  it("should preserve section order", async () => {
    const { normalizeResumeFromApi } = await import("../utils/normalizeResume");
    const order = ["education", "experience"];
    const result = normalizeResumeFromApi({ sectionOrder: order }, "fallback");
    expect(result.sectionOrder).toEqual(order);
  });

  it("should merge section visibility", async () => {
    const { normalizeResumeFromApi } = await import("../utils/normalizeResume");
    const result = normalizeResumeFromApi({ sectionVisibility: { experience: false } }, "fallback");
    expect(result.sectionVisibility.experience).toBe(false);
  });
});
