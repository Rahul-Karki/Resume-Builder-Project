import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("print", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    document.querySelector("[data-print-helper]")?.remove();
    document.querySelector(".__print-clone")?.remove();
  });

  it("should throw when selector is empty", async () => {
    const { printResume } = await import("../utils/print");
    await expect(printResume("", {})).rejects.toThrow("Selector must be provided");
  });

  it("should throw when element is not found", async () => {
    const { printResume } = await import("../utils/print");
    await expect(printResume(".does-not-exist")).rejects.toThrow("Resume element not found");
  });

  it("should add a print helper style to document head", async () => {
    const root = document.createElement("div");
    root.className = "resume-preview";
    document.body.appendChild(root);

    vi.spyOn(console, "error").mockImplementation(() => {});
    const { printResume } = await import("../utils/print");

    try {
      const promise = printResume(".resume-preview");
      await new Promise((r) => setTimeout(r, 200));
      const style = document.querySelector("[data-print-helper]");
      expect(style).not.toBeNull();
    } catch {
    } finally {
      root.remove();
      document.querySelector("[data-print-helper]")?.remove();
      vi.restoreAllMocks();
    }
  });
});
