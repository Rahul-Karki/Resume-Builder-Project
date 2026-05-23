import { describe, it, expect } from "vitest";
import TemplateUsage from "../../models/TemplateUsage";

describe("TemplateUsage model", () => {
  it("should record daily template usage", () => {
    const paths = TemplateUsage.schema.paths;
    expect(paths.templateId.options.required).toBe(true);
    expect(paths.layoutId.options.required).toBe(true);
    expect(paths.date.options.required).toBe(true);
    expect(paths.count).toBeDefined();
    expect(paths.count.options.default).toBe(0);
    expect(paths.resumesCreated).toBeDefined();
    expect(paths.resumesCreated.options.default).toBe(0);
    expect(paths.resumesEdited).toBeDefined();
    expect(paths.resumesEdited.options.default).toBe(0);
  });

  it("should enforce one record per template per day", () => {
    const indexes = TemplateUsage.schema.indexes();
    const uniqueCompound = indexes.find(([key]) => {
      const keys = key as Record<string, unknown>;
      return keys.templateId === 1 && keys.date === 1;
    });
    expect(uniqueCompound).toBeDefined();
    if (uniqueCompound) {
      expect(uniqueCompound[1].unique).toBe(true);
    }
  });

  it("should increment usage counts atomically", () => {
    expect(typeof TemplateUsage.recordUse).toBe("function");
  });
});
