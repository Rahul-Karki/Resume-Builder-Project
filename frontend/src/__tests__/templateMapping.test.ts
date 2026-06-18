import { describe, it, expect } from "vitest";

describe("templateMapping", () => {
  it("should map all 12 templates with correct structure", async () => {
    const { TEMPLATES } = await import("../utils/templateMapping");
    expect(TEMPLATES).toHaveLength(12);
    TEMPLATES.forEach((t: any) => {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.tag).toBeTruthy();
      expect(["Technical", "Professional"]).toContain(t.category);
      expect(["tech", "non-tech"]).toContain(t.audience);
      expect(typeof t.isPremium).toBe("boolean");
      expect(t.palette.bg).toMatch(/^#/);
      expect(t.palette.primary).toMatch(/^#/);
      expect(t.palette.secondary).toMatch(/^#/);
    });
  });

  it("should map tech category templates to Technical", async () => {
    const { TEMPLATES } = await import("../utils/templateMapping");
    const tech = TEMPLATES.filter((t: any) => t.id === "modern" || t.id === "sidebar");
    tech.forEach((t: any) => expect(t.category).toBe("Technical"));
  });

  it("should include sidebar palette when available", async () => {
    const { TEMPLATES } = await import("../utils/templateMapping");
    const sidebar = TEMPLATES.find((t: any) => t.id === "sidebar");
    expect(sidebar?.palette.sidebar).toBeTruthy();
  });
});
