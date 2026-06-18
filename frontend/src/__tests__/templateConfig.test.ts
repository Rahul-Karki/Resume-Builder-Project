import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/resumeTemplate", () => ({
  normalizeResumeTemplateId: vi.fn((id: string) => id),
}));

vi.mock("@/data/templateMeta", () => ({
  templates: [
    { id: "classic", category: "non-tech", name: "Classic", palette: ["#fff", "#000", "#666"], accent: "#1a1a1a",
      cssVars: { accentColor: "#222", bodyFont: "EB Garamond, serif", fontSize: "10pt" },
      slots: { projects: false } },
    { id: "unknown-template", category: "tech" },
  ],
}));

describe("templateConfig", () => {
  it("should validate font values", async () => {
    const { safeFont } = await import("../store/templateConfig");
    expect(safeFont("EB Garamond, serif", "serif")).toBe("EB Garamond, serif");
    expect(safeFont("Invalid Font", "serif")).toBe("serif");
    expect(safeFont(123, "serif")).toBe("serif");
  });

  it("should validate font size values", async () => {
    const { safeFontSize } = await import("../store/templateConfig");
    expect(safeFontSize("10pt", "11pt")).toBe("10pt");
    expect(safeFontSize("13pt", "11pt")).toBe("11pt");
    expect(safeFontSize(null, "11pt")).toBe("11pt");
  });

  it("should validate line height values", async () => {
    const { safeLineHeight } = await import("../store/templateConfig");
    expect(safeLineHeight("1.5", "1.3")).toBe("1.5");
    expect(safeLineHeight("2.0", "1.3")).toBe("1.3");
    expect(safeLineHeight(undefined, "1.3")).toBe("1.3");
  });

  it("should have style presets for all 12 templates", async () => {
    const { TEMPLATE_STYLE_PRESETS } = await import("../store/templateConfig");
    expect(Object.keys(TEMPLATE_STYLE_PRESETS)).toHaveLength(12);
    Object.values(TEMPLATE_STYLE_PRESETS).forEach((preset: any) => {
      expect(preset.accentColor).toMatch(/^#/);
    });
  });

  it("should get base style for known template", async () => {
    const { getTemplateBaseStyle } = await import("../store/templateConfig");
    const style = getTemplateBaseStyle("modern");
    expect(style.accentColor).toBe("#0F766E");
  });

  it("should get base style with defaults for unknown template", async () => {
    const { getTemplateBaseStyle } = await import("../store/templateConfig");
    const style = getTemplateBaseStyle("nonexistent");
    expect(style.accentColor).toBe("#1a1a1a");
  });

  it("should resolve template category from API", async () => {
    const { resolveTemplateCategory } = await import("../store/templateConfig");
    expect(resolveTemplateCategory("modern")).toBe("tech");
    expect(resolveTemplateCategory("classic")).toBe("non-tech");
  });

  it("should prefer API category over local", async () => {
    const { resolveTemplateCategory } = await import("../store/templateConfig");
    expect(resolveTemplateCategory("classic", "tech")).toBe("tech");
  });

  it("should resolve full template config with CSS vars", async () => {
    const { resolveTemplateConfig } = await import("../store/templateConfig");
    const config = resolveTemplateConfig("classic");
    expect(config.templateId).toBe("classic");
    expect(config.style.accentColor).toBe("#222");
    expect(config.style.bodyFont).toBe("EB Garamond, serif");
    expect(config.sectionVisibility.projects).toBe(false);
  });

  it("should fall back gracefully for invalid template config", async () => {
    const { resolveTemplateConfig } = await import("../store/templateConfig");
    const config = resolveTemplateConfig("nonexistent");
    expect(config.templateId).toBe("nonexistent");
    expect(config.style).toBeTruthy();
    expect(config.sectionVisibility).toBeTruthy();
  });

  it("should detect section content", async () => {
    const { sectionHasContent } = await import("../store/templateConfig");
    expect(sectionHasContent({ sections: { experience: [{ id: "1" }] } } as any, "experience")).toBe(true);
    expect(sectionHasContent({ sections: { experience: [] } } as any, "experience")).toBe(false);
  });

  it("should merge template visibility preserving existing resume sections", async () => {
    const { mergeTemplateVisibilityForExistingResume, SECTION_KEYS } = await import("../store/templateConfig");
    const resume = {
      sections: { experience: [{ id: "1" }], education: [], skills: [], projects: [], certifications: [], languages: [] },
      sectionVisibility: { experience: true, education: false, skills: false, projects: false, certifications: false, languages: false },
    } as any;
    const templateVis = { experience: false, education: false, skills: false, projects: false, certifications: false, languages: false };
    const merged = mergeTemplateVisibilityForExistingResume(resume, templateVis);
    expect(merged.experience).toBe(true);
  });
});
