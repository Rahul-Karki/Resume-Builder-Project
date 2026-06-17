import { describe, it, expect, vi } from "vitest";
import { createUISlice, initialUI } from "@/store/slices/uiSlice";

function createMockSet() {
  return vi.fn((fn: any) => {
    if (typeof fn === "function") {
      fn({ ui: { ...initialUI } });
    }
  });
}

describe("uiSlice", () => {
  it("should create slice with initial UI state", () => {
    const set = createMockSet();
    const slice = createUISlice(set);
    expect(slice.ui).toEqual(initialUI);
  });

  it("should set active tab", () => {
    const set = createMockSet();
    const slice = createUISlice(set);
    slice.setActiveTab("style");
    expect(set).toHaveBeenCalled();
  });

  it("should set active section", () => {
    const set = createMockSet();
    const slice = createUISlice(set);
    slice.setActiveSection("education");
    expect(set).toHaveBeenCalled();
  });

  it("should set focused field", () => {
    const set = createMockSet();
    const slice = createUISlice(set);
    slice.setFocusedField("name");
    expect(set).toHaveBeenCalled();
  });

  it("should clear focused field", () => {
    const set = createMockSet();
    const slice = createUISlice(set);
    slice.setFocusedField(null);
    expect(set).toHaveBeenCalled();
  });

  it("should set preview scale", () => {
    const set = createMockSet();
    const slice = createUISlice(set);
    slice.setPreviewScale(0.75);
    expect(set).toHaveBeenCalled();
  });

  it("should set export preset", () => {
    const set = createMockSet();
    const slice = createUISlice(set);
    slice.setExportPreset("compact");
    expect(set).toHaveBeenCalled();
  });
});
