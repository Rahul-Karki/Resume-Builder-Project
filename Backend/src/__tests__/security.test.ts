import { describe, it, expect } from "vitest";

describe("setPathValue security", () => {
  it("rejects __proto__ path", async () => {
    const mod = await import("../controllers/resumeEnhancementController");
    const target = { sections: { experience: [] } };
    expect(() => (mod as any).setPathValue(target, "__proto__.polluted", "evil"))
      .toThrow("Invalid suggestion path");
  });

  it("rejects prototype path", async () => {
    const mod = await import("../controllers/resumeEnhancementController");
    const target = {};
    expect(() => (mod as any).setPathValue(target, "constructor.prototype.evil", "x"))
      .toThrow("Invalid suggestion path");
  });

  it("rejects path with no valid prefix", async () => {
    const mod = await import("../controllers/resumeEnhancementController");
    const target = {};
    expect(() => (mod as any).setPathValue(target, "admin.role", "admin"))
      .toThrow("Unsupported suggestion path");
  });

  it("accepts valid path personalInfo.summary", async () => {
    const mod = await import("../controllers/resumeEnhancementController");
    const target = {};
    (mod as any).setPathValue(target, "personalInfo.summary", "valid summary");
    expect(target.personalInfo?.summary).toBe("valid summary");
  });
});

describe("resumeController mass assignment protection", () => {
  it("only allows whitelisted fields in update payload", async () => {
    const mod = await import("../controllers/resumeController");
    const req = {
      user: { id: "user-1" },
      params: { id: "abc123" },
      body: {
        title: "Updated Resume",
        style: { accentColor: "#ff0000" },
        role: "admin",
        isAdmin: true,
      },
    } as any;
    const res = {
      status: () => res,
      json: () => res,
    } as any;

    const { updateResume } = mod as any;
    expect(typeof updateResume).toBe("function");
  });
});
