import { describe, it, expect } from "vitest";

describe("templateMeta", () => {
  it("should export 12 templates with required fields", async () => {
    const { templates } = await import("../data/templateMeta");
    expect(templates).toHaveLength(12);
    templates.forEach((t: any) => {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.tag).toBeTruthy();
      expect(["tech", "non-tech"]).toContain(t.category);
      expect(["tech", "non-tech"]).toContain(t.audience);
      expect(t.accent).toMatch(/^#/);
      expect(t.palette).toHaveLength(3);
      expect(typeof t.isPremium).toBe("boolean");
    });
  });

  it("should have premium templates", async () => {
    const { templates } = await import("../data/templateMeta");
    const premium = templates.filter((t: any) => t.isPremium);
    expect(premium.length).toBeGreaterThan(0);
    expect(premium.map((t: any) => t.id)).toContain("compact");
  });

  it("should have tech and non-tech categories", async () => {
    const { templates } = await import("../data/templateMeta");
    const tech = templates.filter((t: any) => t.category === "tech");
    const nonTech = templates.filter((t: any) => t.category === "non-tech");
    expect(tech.length).toBeGreaterThan(0);
    expect(nonTech.length).toBeGreaterThan(0);
  });

  it("should have unique IDs", async () => {
    const { templates } = await import("../data/templateMeta");
    const ids = templates.map((t: any) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
