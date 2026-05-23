import { describe, it, expect, vi, beforeEach } from "vitest";

describe("print", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("should call window.print when the selector matches an element", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    document.body.innerHTML = '<div class="resume-preview">Resume</div>';
    const { printResume } = await import("../utils/print");
    const promise = printResume(".resume-preview");
    await new Promise(r => setTimeout(r, 300));
    expect(document.querySelector(".__print-clone")).toBeTruthy();
    printSpy.mockRestore();
  });
  it("should inject A4 print CSS before printing", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    document.body.innerHTML = '<div class="resume-preview">Resume</div>';
    const { printResume } = await import("../utils/print");
    const promise = printResume(".resume-preview");
    await new Promise(r => setTimeout(r, 300));
    const style = document.querySelector('style[data-print-helper="true"]');
    expect(style).toBeTruthy();
    printSpy.mockRestore();
  });
  it("should clean up injected styles after printing", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    document.body.innerHTML = '<div class="resume-preview">Resume</div>';
    const { printResume } = await import("../utils/print");
    const promise = printResume(".resume-preview");
    await new Promise(r => setTimeout(r, 300));
    expect(document.querySelector('style[data-print-helper="true"]')).toBeTruthy();
    printSpy.mockRestore();
  });
});
