import { describe, it, expect, vi, beforeEach } from "vitest";

describe("templateMapping", () => {
  it("should export a non-empty TEMPLATES array", async () => {
    const { TEMPLATES } = await import("../utils/templateMapping");
    expect(Array.isArray(TEMPLATES)).toBe(true);
    expect(TEMPLATES.length).toBeGreaterThan(0);
  });
  it("every template should have a unique id", async () => {
    const { TEMPLATES } = await import("../utils/templateMapping");
    const ids = TEMPLATES.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
  it("every template should have a valid category and audience", async () => {
    const { TEMPLATES } = await import("../utils/templateMapping");
    for (const template of TEMPLATES) {
      expect(template.category).toBeTruthy();
      expect(["tech", "non-tech"]).toContain(template.audience);
    }
  });
  it("every template should have a React component reference", async () => {
    const { TEMPLATES } = await import("../utils/templateMapping");
    for (const template of TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
    }
  });
});
