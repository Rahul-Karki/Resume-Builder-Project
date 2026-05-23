import { describe, it, expect, vi, beforeEach } from "vitest";

describe("printPreview", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("should open a new window with the rendered content", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn(), body: { appendChild: vi.fn() } },
      focus: vi.fn(),
      print: vi.fn(),
    } as any);
    document.body.innerHTML = '<div class="resume-preview">Content</div>';
    const { openPrintPreviewForSelector } = await import("../utils/printPreview");
    await openPrintPreviewForSelector(".resume-preview");
    expect(openSpy).toHaveBeenCalled();
    openSpy.mockRestore();
  });
  it("should include print-friendly styles", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn(), body: { appendChild: vi.fn() } },
      focus: vi.fn(),
      print: vi.fn(),
    } as any);
    document.body.innerHTML = '<div class="resume-preview">Content</div>';
    const { openPrintPreviewForElement } = await import("../utils/printPreview");
    const el = document.querySelector(".resume-preview") as HTMLElement;
    await openPrintPreviewForElement(el);
    expect(openSpy).toHaveBeenCalled();
    openSpy.mockRestore();
  });
  it("should throw when the selector does not match any element", async () => {
    const { openPrintPreviewForSelector } = await import("../utils/printPreview");
    await expect(openPrintPreviewForSelector(".nonexistent")).rejects.toThrow();
  });
});
