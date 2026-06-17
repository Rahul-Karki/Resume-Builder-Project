import { describe, it, expect } from "vitest";

describe("sampleData", () => {
  it("should export sampleData with expected structure", async () => {
    const { sampleData } = await import("../data/sampleData");
    expect(sampleData.title).toBe("Sample Resume");
    expect(sampleData.templateId).toBe("classic");
  });

  it("should have personal info", async () => {
    const { sampleData } = await import("../data/sampleData");
    expect(sampleData.personalInfo.name).toBe("Maya Thompson");
    expect(sampleData.personalInfo.email).toBe("maya.thompson@email.com");
  });

  it("should have experience entries", async () => {
    const { sampleData } = await import("../data/sampleData");
    expect(sampleData.sections.experience.length).toBeGreaterThan(0);
    expect(sampleData.sections.experience[0].company).toBe("BrightPath Health");
  });

  it("should have education entries", async () => {
    const { sampleData } = await import("../data/sampleData");
    expect(sampleData.sections.education.length).toBeGreaterThan(0);
  });

  it("should have skills entries", async () => {
    const { sampleData } = await import("../data/sampleData");
    expect(sampleData.sections.skills.length).toBeGreaterThan(0);
  });

  it("should have projects", async () => {
    const { sampleData } = await import("../data/sampleData");
    expect(sampleData.sections.projects.length).toBeGreaterThan(0);
  });

  it("should have certifications", async () => {
    const { sampleData } = await import("../data/sampleData");
    expect(sampleData.sections.certifications.length).toBeGreaterThan(0);
  });

  it("should have languages", async () => {
    const { sampleData } = await import("../data/sampleData");
    expect(sampleData.sections.languages.length).toBeGreaterThan(0);
  });

  it("should have style and section order", async () => {
    const { sampleData } = await import("../data/sampleData");
    expect(sampleData.style).toBeDefined();
    expect(Array.isArray(sampleData.sectionOrder)).toBe(true);
    expect(sampleData.sectionVisibility).toBeDefined();
  });
});
