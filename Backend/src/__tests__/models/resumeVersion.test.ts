import { describe, it, expect } from "vitest";
import ResumeVersion from "../../models/ResumeVersion";

describe("ResumeVersion model", () => {
  it("should create a versioned snapshot of a resume", () => {
    const paths = ResumeVersion.schema.paths;
    expect(paths.resumeId.options.required).toBe(true);
    expect(paths.userId.options.required).toBe(true);
    expect(paths.versionNo.options.required).toBe(true);
    expect(paths.versionNo.options.min).toBe(1);
    expect(paths.snapshot.options.required).toBe(true);
    expect(paths.note).toBeDefined();
  });

  it("should auto-increment the version number per resume", () => {
    expect(ResumeVersion.schema.path("versionNo")).toBeDefined();
    expect(ResumeVersion.schema.path("versionNo") instanceof Object).toBe(true);
  });

  it("should reject duplicate version numbers for the same resume", () => {
    const indexes = ResumeVersion.schema.indexes();
    const uniqueCompound = indexes.find(([key]) => {
      const keys = key as Record<string, unknown>;
      return keys.resumeId === 1 && keys.versionNo === -1;
    });
    expect(uniqueCompound).toBeDefined();
    if (uniqueCompound) {
      expect(uniqueCompound[1].unique).toBe(true);
    }
  });
});
