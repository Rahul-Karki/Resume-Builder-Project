import { describe, it, expect } from "vitest";
import Resume from "../../models/Resume";

describe("Resume model", () => {
  it("should create a resume with personal info and sections", () => {
    const paths = Resume.schema.paths;
    expect(paths["userId"].options.required).toBe(true);
    expect(paths["title"].options.required).toBe(true);
    expect(paths["templateId"].options.required).toBe(true);
    expect(paths["templateId"].options.default).toBe("classic");
    expect(paths["personalInfo.name"]).toBeDefined();
    expect(paths["personalInfo.email"]).toBeDefined();
    expect(paths["sections.experience"]).toBeDefined();
    expect(paths["sections.education"]).toBeDefined();
  });

  it("should validate section structure and field types", () => {
    const experiencePath = Resume.schema.path("sections.experience") as any;
    expect(experiencePath).toBeDefined();
    expect(experiencePath.instance).toBe("Array");
    const contentModePath = Resume.schema.path("sections.experience.contentMode") as any;
    if (contentModePath) {
      expect(contentModePath.options.enum).toEqual(["bullets", "paragraph"]);
    }
    const proficiencyPath = Resume.schema.path("sections.languages.proficiency") as any;
    if (proficiencyPath) {
      expect(proficiencyPath.options.enum).toContain("Native");
      expect(proficiencyPath.options.enum).toContain("Fluent");
      expect(proficiencyPath.options.enum).toContain("Basic");
    }
  });

  it("should support variant linking via baseResumeId", () => {
    const paths = Resume.schema.paths;
    expect(paths["baseResumeId"]).toBeDefined();
    expect(paths["isVariant"]).toBeDefined();
    expect(paths["isVariant"].options.default).toBe(false);
    expect(paths["variantLabel"]).toBeDefined();
    expect(paths["targetRole"]).toBeDefined();
  });

  it("should store ATS scores and analysis metadata", () => {
    const paths = Resume.schema.paths;
    expect(paths["atsScore"]).toBeDefined();
    expect(paths["atsScore"].options.default).toBe(null);
    expect(paths["atsStatus"]).toBeDefined();
    expect(paths["atsAnalyzedAt"]).toBeDefined();
    expect(paths["latestAtsAnalysis"]).toBeDefined();
  });

  it("should have timestamps enabled", () => {
    expect(Resume.schema.options.timestamps).toBe(true);
  });
});
