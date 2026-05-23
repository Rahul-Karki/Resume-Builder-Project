import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }));
vi.mock("path", () => ({ default: { resolve: vi.fn((...a: string[]) => a.join("/")) }, resolve: vi.fn((...a: string[]) => a.join("/")) }));

beforeEach(() => { vi.clearAllMocks(); });

describe("atsPromptTemplates", () => {
  it("should load the system prompt from the file when available", async () => {
    vi.resetModules();
    const fs = await import("fs");
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(`ENHANCED_ATS_SYSTEM_PROMPT = """Custom system prompt"""`);
    const mod = await import("../../utils/atsPromptTemplates");
    expect(mod.ENHANCED_ATS_SYSTEM_PROMPT).toBe("Custom system prompt");
  });

  it("should fall back to the hardcoded default when the file is missing", async () => {
    vi.resetModules();
    const fs = await import("fs");
    (fs.existsSync as any).mockReturnValue(false);
    const mod = await import("../../utils/atsPromptTemplates");
    expect(typeof mod.ENHANCED_ATS_SYSTEM_PROMPT).toBe("string");
    expect(mod.ENHANCED_ATS_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it("should interpolate resume content into the user prompt", async () => {
    vi.resetModules();
    const fs = await import("fs");
    (fs.existsSync as any).mockReturnValue(false);
    const { buildEnhancedAtsUserPrompt } = await import("../../utils/atsPromptTemplates");
    const result = buildEnhancedAtsUserPrompt("My resume", "Job desc here");
    expect(result).toContain("My resume");
    expect(result).toContain("Job desc here");
  });

  it("should include target keywords in the keyword analysis prompt", async () => {
    vi.resetModules();
    const fs = await import("fs");
    (fs.existsSync as any).mockReturnValue(false);
    const { ENHANCED_ATS_SCORING_PROMPT } = await import("../../utils/atsPromptTemplates");
    expect(ENHANCED_ATS_SCORING_PROMPT).toContain("keyword_analysis");
  });
});
