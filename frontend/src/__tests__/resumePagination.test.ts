import { describe, expect, it } from "vitest";
import { computePageOffsets, CONTENT_HEIGHT_PX } from "@/utils/resumePagination";

describe("resumePagination", () => {
  it("returns a single page when content fits", () => {
    expect(computePageOffsets(900, CONTENT_HEIGHT_PX)).toEqual([0]);
  });

  it("returns a single page when content is smaller than page height", () => {
    expect(computePageOffsets(500, CONTENT_HEIGHT_PX)).toEqual([0]);
  });

  it("slices multi-page content at regular intervals", () => {
    const offsets = computePageOffsets(3200, CONTENT_HEIGHT_PX);
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(1123);
    expect(offsets[2]).toBe(2246);
    expect(offsets.length).toBe(3);
  });

  it("adds one page for overflow beyond the last full page", () => {
    const offsets = computePageOffsets(3500, CONTENT_HEIGHT_PX);
    expect(offsets.length).toBe(4);
    offsets.forEach((o, i) => {
      if (i > 0) expect(o - offsets[i - 1]).toBe(1123);
    });
  });

  it("handles edge case of zero height", () => {
    expect(computePageOffsets(0, CONTENT_HEIGHT_PX)).toEqual([0]);
  });

  it("handles negative height gracefully", () => {
    expect(computePageOffsets(-1, CONTENT_HEIGHT_PX)).toEqual([0]);
  });

  it("handles very large content", () => {
    const offsets = computePageOffsets(10000, CONTENT_HEIGHT_PX);
    expect(offsets.length).toBeGreaterThanOrEqual(8);
    offsets.forEach((o, i) => {
      if (i > 0) expect(o - offsets[i - 1]).toBe(1123);
    });
  });
});
