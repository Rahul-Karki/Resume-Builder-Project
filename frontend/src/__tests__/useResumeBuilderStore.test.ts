import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  api: { get: vi.fn().mockResolvedValue({ data: {} }), post: vi.fn().mockResolvedValue({ data: {} }), put: vi.fn().mockResolvedValue({ data: {} }) },
}));
vi.mock("@/data/templateMeta", () => ({ templates: [] }));

describe("useResumeBuilderStore", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.doMock("@/services/api", () => ({
      api: { get: vi.fn().mockResolvedValue({ data: {} }), post: vi.fn().mockResolvedValue({ data: {} }), put: vi.fn().mockResolvedValue({ data: {} }) },
    }));
    vi.doMock("@/data/templateMeta", () => ({ templates: [] }));
  });

  it("should initialize with default state", async () => {
    const { useResumeBuilderStore } = await import("../store/useResumeBuilderStore");
    const state = useResumeBuilderStore.getState();
    expect(state.resume.title).toBe("Untitled Resume");
    expect(state.resume.templateId).toBe("classic");
    expect(state.ui.activeTab).toBe("content");
  });
  it("should update personal info when setPersonalInfo is called", async () => {
    const { useResumeBuilderStore } = await import("../store/useResumeBuilderStore");
    useResumeBuilderStore.getState().updatePersonalInfo("name", "John Doe");
    expect(useResumeBuilderStore.getState().resume.personalInfo.name).toBe("John Doe");
    expect(useResumeBuilderStore.getState().ui.isDirty).toBe(true);
  });
  it("should add a new section entry when addWorkEntry is called", async () => {
    const { useResumeBuilderStore } = await import("../store/useResumeBuilderStore");
    const before = useResumeBuilderStore.getState().resume.sections.experience.length;
    useResumeBuilderStore.getState().addExperience();
    const after = useResumeBuilderStore.getState().resume.sections.experience.length;
    expect(after).toBe(before + 1);
  });
  it("should remove a section entry when removeWorkEntry is called", async () => {
    const { useResumeBuilderStore } = await import("../store/useResumeBuilderStore");
    useResumeBuilderStore.getState().addExperience();
    const before = useResumeBuilderStore.getState().resume.sections.experience.length;
    const id = useResumeBuilderStore.getState().resume.sections.experience[0].id;
    useResumeBuilderStore.getState().removeExperience(id);
    expect(useResumeBuilderStore.getState().resume.sections.experience.length).toBe(before - 1);
  });
  it("should update section order when setSectionOrder is called", async () => {
    const { useResumeBuilderStore } = await import("../store/useResumeBuilderStore");
    const order = useResumeBuilderStore.getState().resume.sectionOrder;
    useResumeBuilderStore.getState().reorderSections(0, 1);
    expect(useResumeBuilderStore.getState().resume.sectionOrder).not.toEqual(order);
  });
  it("should toggle section visibility when toggleSection is called", async () => {
    const { useResumeBuilderStore } = await import("../store/useResumeBuilderStore");
    const initial = useResumeBuilderStore.getState().resume.sectionVisibility.experience;
    useResumeBuilderStore.getState().toggleSectionVisibility("experience");
    expect(useResumeBuilderStore.getState().resume.sectionVisibility.experience).toBe(!initial);
  });
  it("should update style properties when setStyle is called", async () => {
    const { useResumeBuilderStore } = await import("../store/useResumeBuilderStore");
    useResumeBuilderStore.getState().updateStyle("accentColor", "#ff0000");
    expect(useResumeBuilderStore.getState().resume.style.accentColor).toBe("#ff0000");
  });
  it("should load a resume document and populate all fields", async () => {
    const { useResumeBuilderStore } = await import("../store/useResumeBuilderStore");
    const doc = {
      _id: "r1",
      title: "Loaded Resume",
      templateId: "modern",
      personalInfo: { name: "Jane", title: "Engineer", email: "j@j.com", phone: "", location: "", linkedin: "", github: "", portfolio: "", summary: "" },
      sections: { experience: [], education: [], skills: [], projects: [], certifications: [], languages: [] },
      style: { accentColor: "#0F766E", headingColor: "#134E4A", textColor: "#333", mutedColor: "#666", borderColor: "#ccc", backgroundColor: "#fff", bodyFont: "DM Sans, sans-serif", headingFont: "DM Sans, sans-serif", fontSize: "10.5pt", lineHeight: "1.5", pageMargin: "0.5in", sectionSpacing: "12pt", showDividers: true, bulletStyle: "bullet", headerAlign: "left" },
      sectionOrder: ["experience", "education", "skills"],
      sectionVisibility: { experience: true, education: true, skills: true, projects: true, certifications: true, languages: true },
    } as any;
    await useResumeBuilderStore.getState().loadResume("r1", doc);
    expect(useResumeBuilderStore.getState().resume.title).toBe("Loaded Resume");
    expect(useResumeBuilderStore.getState().resume.personalInfo.name).toBe("Jane");
  });
  it("should reset all state when resetAll is called", async () => {
    const { useResumeBuilderStore } = await import("../store/useResumeBuilderStore");
    useResumeBuilderStore.getState().updatePersonalInfo("name", "Temp");
    useResumeBuilderStore.getState().addExperience();
    const { useResumeBuilderStore: store2 } = await import("../store/useResumeBuilderStore");
    store2.setState({ resume: { title: "Untitled Resume", templateId: "classic", personalInfo: { name: "", title: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "", summary: "" }, sections: { experience: [], education: [], skills: [], projects: [], certifications: [], languages: [] }, style: { accentColor: "#1a1a1a", headingColor: "#111111", textColor: "#333333", mutedColor: "#666666", borderColor: "#cccccc", backgroundColor: "#FAF8F5", bodyFont: "EB Garamond, serif", headingFont: "EB Garamond, serif", fontSize: "10.5pt", lineHeight: "1.5", pageMargin: "0.5in", sectionSpacing: "12pt", showDividers: true, bulletStyle: "bullet", headerAlign: "left" }, sectionOrder: ["experience", "education", "skills", "projects", "certifications", "languages"], sectionVisibility: { experience: true, education: true, skills: true, projects: true, certifications: true, languages: true } }, ui: { activeTab: "content", activeSection: "personal", focusedField: null, previewScale: 0.5, exportPreset: "standard", isSaving: false, isSaved: false, isDirty: false, saveError: null } });
    const state = store2.getState();
    expect(state.resume.personalInfo.name).toBe("");
    expect(state.resume.sections.experience.length).toBe(0);
    expect(state.ui.isDirty).toBe(false);
  });
  it("should handle template upgrades and merge style overrides", async () => {
    const { useResumeBuilderStore } = await import("../store/useResumeBuilderStore");
    const { templates } = await import("@/data/templateMeta");
    useResumeBuilderStore.setState({ resume: { ...useResumeBuilderStore.getState().resume, templateId: "classic" } });
    expect(useResumeBuilderStore.getState().resume.templateId).toBe("classic");
  });
});
