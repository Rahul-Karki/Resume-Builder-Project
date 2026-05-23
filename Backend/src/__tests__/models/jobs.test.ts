import { describe, it, expect } from "vitest";
import Job from "../../models/Jobs";

describe("Jobs model", () => {
  it("should create a job listing with recruiter and title", () => {
    const paths = Job.schema.paths;
    expect(paths["recruiterId"].options.required).toBe(true);
    expect(paths["title"].options.required).toBe(true);
    expect(paths["company"].options.required).toBe(true);
    expect(paths["description"].options.required).toBe(true);
  });

  it("should support text search across title, company, and description", () => {
    const indexes = Job.schema.indexes();
    const textIndex = indexes.find(([key]) => {
      const keys = key as Record<string, unknown>;
      return keys.title === "text" && keys.company === "text" && keys.description === "text";
    });
    expect(textIndex).toBeDefined();
  });

  it("should store skills as an array of strings", () => {
    const paths = Job.schema.paths;
    const skillsPath = paths["skills"];
    expect(skillsPath).toBeDefined();
    expect(skillsPath.instance).toBe("Array");
  });
});
