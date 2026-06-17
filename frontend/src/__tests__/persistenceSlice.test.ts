import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { resume: { _id: "server-1", templateId: "modern" } } }),
    post: vi.fn().mockResolvedValue({ data: { resume: { _id: "new-1", updatedAt: "2025-01-01" } } }),
    put: vi.fn().mockResolvedValue({ data: { resume: { _id: "server-1", updatedAt: "2025-01-01" } } }),
  },
}));

vi.mock("@/store/templateConfig", () => ({
  resolveTemplateConfig: vi.fn(() => ({
    templateId: "modern",
    templateCategory: "tech",
    style: { accentColor: "#000" },
    sectionVisibility: { experience: true, education: true, skills: true, projects: true, certifications: true, languages: true },
  })),
  mergeTemplateVisibilityForExistingResume: vi.fn(() => ({ experience: true })),
}));

vi.mock("@/data/templateMeta", () => ({ templates: [] }));

describe("persistenceSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export createPersistenceSlice function", async () => {
    const mod = await import("@/store/slices/persistenceSlice");
    expect(typeof mod.createPersistenceSlice).toBe("function");
  });

  it("should create slice with required methods", async () => {
    const { createPersistenceSlice } = await import("@/store/slices/persistenceSlice");
    const set = vi.fn();
    const get = vi.fn(() => ({
      resume: {
        title: "Test", templateId: "classic", personalInfo: {}, style: {},
        sections: { experience: [], education: [], skills: [], projects: [], certifications: [], languages: [] },
        sectionOrder: ["experience"], sectionVisibility: { experience: true, education: true, skills: true, projects: true, certifications: true, languages: true },
      },
    }));
    const slice = createPersistenceSlice(set, get);
    expect(typeof slice.saveResume).toBe("function");
    expect(typeof slice.loadResume).toBe("function");
    expect(typeof slice.initFromTemplate).toBe("function");
    expect(typeof slice.applyTemplateUpgrade).toBe("function");
  });

  it("should call saveResume and set saving state", async () => {
    const { createPersistenceSlice } = await import("@/store/slices/persistenceSlice");
    const set = vi.fn();
    const get = vi.fn(() => ({
      resume: {
        id: "server-1",
        title: "Test", templateId: "classic", personalInfo: {}, style: {},
        sections: { experience: [], education: [], skills: [], projects: [], certifications: [], languages: [] },
        sectionOrder: ["experience"], sectionVisibility: { experience: true, education: true, skills: true, projects: true, certifications: true, languages: true },
      },
    }));
    const slice = createPersistenceSlice(set, get);
    await slice.saveResume();
    expect(get).toHaveBeenCalled();
  });

  it("should load a preloaded resume", async () => {
    const { createPersistenceSlice } = await import("@/store/slices/persistenceSlice");
    const set = vi.fn();
    const get = vi.fn(() => ({}));
    const slice = createPersistenceSlice(set, get);
    await slice.loadResume("preloaded-1", { templateId: "modern", personalInfo: { name: "Jane" } } as any);
    expect(set).toHaveBeenCalled();
  });

  it("should init from template", async () => {
    const { createPersistenceSlice } = await import("@/store/slices/persistenceSlice");
    const set = vi.fn();
    const get = vi.fn(() => ({}));
    const slice = createPersistenceSlice(set, get);
    await slice.initFromTemplate("modern");
    expect(set).toHaveBeenCalled();
  });

  it("should apply template upgrade", async () => {
    const { createPersistenceSlice } = await import("@/store/slices/persistenceSlice");
    const set = vi.fn();
    const get = vi.fn(() => ({
      resume: { templateId: "classic", sectionVisibility: {} },
    }));
    const slice = createPersistenceSlice(set, get);
    await slice.applyTemplateUpgrade("modern");
    expect(set).toHaveBeenCalled();
  });
});
