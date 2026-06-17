import { describe, it, expect, vi, beforeEach } from "vitest";

describe("pdfGenerator", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it.skip("should generate a PDF from a DOM element", async () => {
    const { generatePDF } = await import("../utils/pdfGenerator");
    const mockElement = { style: {}, scrollWidth: 800, scrollHeight: 1000, scrollTop: 0, scrollLeft: 0 } as HTMLElement;
    vi.doMock("html2canvas", () => ({ default: vi.fn().mockResolvedValue({ toDataURL: vi.fn().mockReturnValue("data:image/png;base64,"), width: 800, height: 1000 }) }));
    vi.doMock("jspdf", () => ({
      default: vi.fn().mockImplementation(() => ({ addImage: vi.fn(), output: vi.fn().mockReturnValue(new Blob([])), setProperties: vi.fn() })),
    }));
    const pdfBlob = await generatePDF({ targetElement: mockElement, options: { filename: "test.pdf", orientation: "portrait" } });
    expect(pdfBlob).toBeInstanceOf(Blob);
  });
  it.skip("should handle multi-page content", async () => {
    const { generatePDF } = await import("../utils/pdfGenerator");
    const mockElement = { style: {}, scrollWidth: 800, scrollHeight: 3000, scrollTop: 0, scrollLeft: 0 } as HTMLElement;
    vi.doMock("html2canvas", () => ({ default: vi.fn().mockResolvedValue({ toDataURL: vi.fn().mockReturnValue("data:image/png;base64,"), width: 800, height: 3000 }) }));
    vi.doMock("jspdf", () => ({
      default: vi.fn().mockImplementation(() => ({ addImage: vi.fn(), output: vi.fn().mockReturnValue(new Blob([])), setProperties: vi.fn() })),
    }));
    const pdfBlob = await generatePDF({ targetElement: mockElement, options: { filename: "multi.pdf", orientation: "portrait" } });
    expect(pdfBlob).toBeInstanceOf(Blob);
  });
  it("should throw when the target element does not exist", async () => {
    const { generateAndDownloadPDF } = await import("../utils/pdfGenerator");
    await expect(generateAndDownloadPDF(null as any, { filename: "fail.pdf", orientation: "portrait" })).rejects.toThrow();
  });
  it("should preload images before rendering", async () => {
    const { preloadImages } = await import("../utils/pdfGenerator");
    const mockElement = { querySelectorAll: vi.fn().mockReturnValue([]) } as unknown as HTMLElement;
    await expect(preloadImages(mockElement)).resolves.toBeUndefined();
  });
  it("should wait for fonts to load before rendering", async () => {
    const { waitForFonts } = await import("../utils/pdfGenerator");
    Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve(undefined) }, configurable: true });
    await expect(waitForFonts()).resolves.toBeUndefined();
  });

  it("should preload images with actual src", async () => {
    const { preloadImages } = await import("../utils/pdfGenerator");
    const img = document.createElement("img");
    img.src = "data:image/png;base64,iVBORw0KGgo=";
    const mockElement = { querySelectorAll: vi.fn().mockReturnValue([img]) } as unknown as HTMLElement;
    await expect(preloadImages(mockElement)).resolves.toBeUndefined();
  });

  it("should handle downloadPDF errors", async () => {
    const { downloadPDF } = await import("../utils/pdfGenerator");
    await expect(downloadPDF(null as any, "test.pdf")).rejects.toThrow();
  });

  it("should handle fonts ready with errors gracefully", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const origFonts = document.fonts;
    Object.defineProperty(document, "fonts", { value: { ready: Promise.reject(new Error("font load failed")) }, configurable: true });
    const { waitForFonts } = await import("../utils/pdfGenerator");
    const result = waitForFonts();
    await new Promise(r => setTimeout(r, 10));
    Object.defineProperty(document, "fonts", { value: origFonts, configurable: true });
    await expect(result).resolves.toBeUndefined();
    vi.restoreAllMocks();
  });
});
