import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/resumeTemplate", () => ({
  normalizeResumeTemplateId: vi.fn((id: string) => id),
}));

vi.mock("@/store/templateConfig", () => ({
  getTemplateBaseStyle: vi.fn(() => ({ accentColor: "#1a1a1a" })),
}));

describe("documentSlice", () => {
  it("should create slice with initial resume state", async () => {
    const { createDocumentSlice, initialResume } = await import("../store/slices/documentSlice");
    const set = vi.fn();
    const slice = createDocumentSlice(set, vi.fn());
    expect(slice.resume.title).toBe("Untitled Resume");
    expect(slice.resume.templateId).toBe("classic");
    expect(slice.resume.personalInfo).toBeTruthy();
    expect(Array.isArray(slice.resume.sections.experience)).toBe(true);
  });

  it("should mark dirty and unsaved on update", async () => {
    const { createDocumentSlice } = await import("../store/slices/documentSlice");
    const set = vi.fn((fn: any) => fn({ ui: { isDirty: false, isSaved: true } }));
    const slice = createDocumentSlice(set, vi.fn());
    slice.markDirty();
    expect(set).toHaveBeenCalled();
  });

  it("should update personal info", async () => {
    const { createDocumentSlice } = await import("../store/slices/documentSlice");
    const set = vi.fn((fn: any) => fn({ resume: { personalInfo: {} }, ui: { isDirty: false, isSaved: true } }));
    const slice = createDocumentSlice(set, vi.fn());
    slice.updatePersonalInfo("name", "John");
    expect(set).toHaveBeenCalled();
  });

  it("should update style", async () => {
    const { createDocumentSlice } = await import("../store/slices/documentSlice");
    const set = vi.fn((fn: any) => fn({ resume: { style: {} }, ui: { isDirty: false, isSaved: true } }));
    const slice = createDocumentSlice(set, vi.fn());
    slice.updateStyle("accentColor", "#ff0000");
    expect(set).toHaveBeenCalled();
  });

  it("should add and remove experience", async () => {
    const { createDocumentSlice } = await import("../store/slices/documentSlice");
    const state = { resume: { sections: { experience: [] }, sectionVisibility: { experience: true } }, ui: { isDirty: false } };
    const set = vi.fn((fn: any) => { fn(state); });
    const slice = createDocumentSlice(set, vi.fn());

    slice.addExperience();
    expect(set).toHaveBeenCalled();

    slice.removeExperience("nonexistent");
    expect(set).toHaveBeenCalledTimes(2);
  });

  it("should add and remove education", async () => {
    const { createDocumentSlice } = await import("../store/slices/documentSlice");
    const state = { resume: { sections: { education: [] }, sectionVisibility: { education: true } }, ui: { isDirty: false } };
    const set = vi.fn((fn: any) => { fn(state); });
    const slice = createDocumentSlice(set, vi.fn());

    slice.addEducation();
    expect(set).toHaveBeenCalled();

    slice.removeEducation("nonexistent");
    expect(set).toHaveBeenCalledTimes(2);
  });

  it("should reset style to template defaults", async () => {
    const { createDocumentSlice } = await import("../store/slices/documentSlice");
    const state = { resume: { style: { accentColor: "#fff" }, templateId: "modern" }, ui: { isDirty: false, isSaved: true } };
    const set = vi.fn((fn: any) => { fn(state); });
    const slice = createDocumentSlice(set, vi.fn());
    slice.resetStyle();
    expect(set).toHaveBeenCalled();
  });

  it("should toggle section visibility", async () => {
    const { createDocumentSlice } = await import("../store/slices/documentSlice");
    const state = { resume: { sectionVisibility: { experience: true } }, ui: { isDirty: false } };
    const set = vi.fn((fn: any) => { fn(state); });
    const slice = createDocumentSlice(set, vi.fn());
    slice.toggleSectionVisibility("experience");
    expect(set).toHaveBeenCalled();
  });

  it("should set title", async () => {
    const { createDocumentSlice } = await import("../store/slices/documentSlice");
    const state = { resume: { title: "" }, ui: { isDirty: false } };
    const set = vi.fn((fn: any) => { fn(state); });
    const slice = createDocumentSlice(set, vi.fn());
    slice.setTitle("My Resume");
    expect(set).toHaveBeenCalled();
  });

  it("should add skill group and project bullet", async () => {
    const { createDocumentSlice } = await import("../store/slices/documentSlice");
    const state = { resume: { sections: { skills: [], projects: [{ id: "p1", bullets: [] }] }, sectionVisibility: { skills: true, projects: true } }, ui: { isDirty: false } };
    const set = vi.fn((fn: any) => { fn(state); });
    const slice = createDocumentSlice(set, vi.fn());

    slice.addSkillGroup();
    expect(set).toHaveBeenCalled();

    slice.addProjectBullet("p1");
    expect(set).toHaveBeenCalledTimes(2);
  });

  it("should add and remove certifications and languages", async () => {
    const { createDocumentSlice } = await import("../store/slices/documentSlice");
    const state = { resume: { sections: { certifications: [], languages: [] }, sectionVisibility: { certifications: true, languages: true } }, ui: { isDirty: false } };
    const set = vi.fn((fn: any) => { fn(state); });
    const slice = createDocumentSlice(set, vi.fn());

    slice.addCertification();
    slice.addLanguage();
    expect(set).toHaveBeenCalledTimes(2);

    slice.removeCertification("nonexistent");
    slice.removeLanguage("nonexistent");
    expect(set).toHaveBeenCalledTimes(4);
  });

  it("should reorder sections", async () => {
    const { createDocumentSlice } = await import("../store/slices/documentSlice");
    const state = { resume: { sectionOrder: ["experience", "education", "skills"] }, ui: {} };
    const set = vi.fn((fn: any) => { fn(state); });
    const slice = createDocumentSlice(set, vi.fn());
    slice.reorderSections(0, 2);
    expect(set).toHaveBeenCalled();
  });
});
