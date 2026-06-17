import { describe, it, expect } from "vitest";

describe("admin.types", () => {
  it("should export NAV_ITEMS", async () => {
    const { NAV_ITEMS } = await import("../types/admin.types");
    expect(Array.isArray(NAV_ITEMS)).toBe(true);
    expect(NAV_ITEMS.length).toBeGreaterThan(0);
  });

  it("should export PAGE_LABELS", async () => {
    const { PAGE_LABELS } = await import("../types/admin.types");
    expect(PAGE_LABELS.dashboard).toBe("Dashboard");
    expect(PAGE_LABELS.templates).toBe("Templates");
  });

  it("should export PAGE_SUBTITLES", async () => {
    const { PAGE_SUBTITLES } = await import("../types/admin.types");
    expect(PAGE_SUBTITLES.dashboard).toBeTruthy();
  });

  it("should export DEFAULT_CSS_VARS", async () => {
    const { DEFAULT_CSS_VARS } = await import("../types/admin.types");
    expect(DEFAULT_CSS_VARS.accentColor).toBe("#1a1a1a");
    expect(DEFAULT_CSS_VARS.bodyFont).toContain("serif");
  });

  it("should export DEFAULT_SLOTS", async () => {
    const { DEFAULT_SLOTS } = await import("../types/admin.types");
    expect(DEFAULT_SLOTS.summary).toBe(true);
    expect(DEFAULT_SLOTS.experience).toBe(true);
  });

  it("should export DEFAULT_FORM", async () => {
    const { DEFAULT_FORM } = await import("../types/admin.types");
    expect(DEFAULT_FORM.layoutId).toBe("");
    expect(DEFAULT_FORM.isPremium).toBe(false);
  });

  it("should export CATEGORY_OPTIONS and AUDIENCE_OPTIONS", async () => {
    const { CATEGORY_OPTIONS, AUDIENCE_OPTIONS } = await import("../types/admin.types");
    expect(CATEGORY_OPTIONS).toHaveLength(2);
    expect(AUDIENCE_OPTIONS).toHaveLength(2);
  });

  it("should export FONT_OPTIONS", async () => {
    const { FONT_OPTIONS } = await import("../types/admin.types");
    expect(Array.isArray(FONT_OPTIONS)).toBe(true);
    expect(FONT_OPTIONS.length).toBeGreaterThan(0);
  });

  it("should export REGISTERED_LAYOUT_IDS", async () => {
    const { REGISTERED_LAYOUT_IDS } = await import("../types/admin.types");
    expect(Array.isArray(REGISTERED_LAYOUT_IDS)).toBe(true);
    expect(REGISTERED_LAYOUT_IDS).toContain("classic");
    expect(REGISTERED_LAYOUT_IDS).toContain("modern");
  });
});
