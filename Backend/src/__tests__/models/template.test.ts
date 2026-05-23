import { describe, it, expect } from "vitest";
import Template from "../../models/Template";

describe("Template model", () => {
  it("should create a template with a unique layoutId", () => {
    const paths = Template.schema.paths;
    expect(paths["layoutId"].options.required).toBe(true);
    expect(paths["layoutId"].options.unique).toBe(true);
    expect(paths["name"].options.required).toBe(true);
    expect(paths["name"].options.maxlength).toBe(60);
    expect(paths["createdBy"].options.required).toBe(true);
    expect(paths["updatedBy"].options.required).toBe(true);
  });

  it("should reject duplicate layoutIds", () => {
    const paths = Template.schema.paths;
    expect(paths["layoutId"].options.unique).toBe(true);
  });

  it("should validate audience and category enums", () => {
    const categoryPath = Template.schema.path("category") as any;
    const audiencePath = Template.schema.path("audience") as any;
    expect(categoryPath.options.enum).toEqual(["tech", "non-tech"]);
    expect(audiencePath.options.enum).toEqual(["tech", "non-tech"]);
  });

  it("should track publishedAt when status changes to published", () => {
    const statusPath = Template.schema.path("status") as any;
    expect(statusPath.options.enum).toContain("published");
    expect(statusPath.options.enum).toContain("draft");
    expect(statusPath.options.enum).toContain("archived");
    const paths = Template.schema.paths;
    expect(paths["publishedAt"]).toBeDefined();
    expect(paths["publishedAt"].options.default).toBe(null);
  });

  it("should store CSS variable overrides", () => {
    const accentColorPath = Template.schema.path("cssVars.accentColor") as any;
    expect(accentColorPath).toBeDefined();
    expect(accentColorPath.options.default).toBe("#1a1a1a");
    const bodyFontPath = Template.schema.path("cssVars.bodyFont") as any;
    expect(bodyFontPath).toBeDefined();
  });
});
