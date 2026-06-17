import { describe, it, expect, vi } from "vitest";

vi.mock("@/store/useResumeBuilderStore", () => ({
  useResumeBuilderStore: Object.assign(
    (selector: any) => selector(mockState),
    { getState: () => mockState, setState: vi.fn() },
  ),
}));

const mockState = {
  resume: {
    title: "Test Resume",
    templateId: "classic",
    templateCategory: "non-tech",
    personalInfo: { name: "John", title: "Dev", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "", summary: "" },
    style: { accentColor: "#000" },
    sectionVisibility: { experience: true, education: true, skills: true, projects: true, certifications: true, languages: true },
    sectionOrder: ["experience", "education"],
    sections: {
      experience: [{ id: "1", company: "Acme" }],
      education: [{ id: "2", institution: "MIT" }],
      skills: [{ id: "3", category: "Frontend" }],
      projects: [{ id: "4", name: "Project" }],
      certifications: [{ id: "5", name: "Cert" }],
      languages: [{ id: "6", language: "English" }],
    },
  },
  ui: {
    activeTab: "content",
    activeSection: "personal",
    focusedField: null,
    isSaving: false,
    isDirty: false,
  },
};

describe("selectors", () => {
  it("should export all selector functions", async () => {
    const mod = await import("../store/selectors");
    expect(typeof mod.useResume).toBe("function");
    expect(typeof mod.useResumeUI).toBe("function");
    expect(typeof mod.usePersonalInfo).toBe("function");
    expect(typeof mod.useResumeStyle).toBe("function");
    expect(typeof mod.useSectionVisibility).toBe("function");
    expect(typeof mod.useSectionOrder).toBe("function");
    expect(typeof mod.useExperience).toBe("function");
    expect(typeof mod.useEducation).toBe("function");
    expect(typeof mod.useSkills).toBe("function");
    expect(typeof mod.useProjects).toBe("function");
    expect(typeof mod.useCertifications).toBe("function");
    expect(typeof mod.useLanguages).toBe("function");
    expect(typeof mod.useIsSaving).toBe("function");
    expect(typeof mod.useIsDirty).toBe("function");
    expect(typeof mod.useTemplateId).toBe("function");
    expect(typeof mod.useTemplateCategory).toBe("function");
    expect(typeof mod.useActiveSection).toBe("function");
    expect(typeof mod.useFocusedField).toBe("function");
    expect(typeof mod.useResumeActions).toBe("function");
  });
});
