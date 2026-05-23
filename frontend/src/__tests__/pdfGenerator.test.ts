import { describe, it, expect, vi, beforeEach } from "vitest";

describe("pdfGenerator", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should generate a PDF from a DOM element", async () => {
    const { generatePDF } = await import("../utils/pdfGenerator");
    const mockElement = { style: {}, scrollWidth: 800, scrollHeight: 1000, scrollTop: 0, scrollLeft: 0 } as HTMLElement;
    vi.doMock("html2canvas", () => ({ default: vi.fn().mockResolvedValue({ toDataURL: vi.fn().mockReturnValue("data:image/png;base64,"), width: 800, height: 1000 }) }));
    vi.doMock("jspdf", () => ({
      default: vi.fn().mockImplementation(() => ({ addImage: vi.fn(), output: vi.fn().mockReturnValue(new Blob([])), setProperties: vi.fn() })),
    }));
    const pdfBlob = await generatePDF({ targetElement: mockElement, options: { filename: "test.pdf", orientation: "portrait" } });
    expect(pdfBlob).toBeInstanceOf(Blob);
  });
  it("should handle multi-page content", async () => {
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
});
