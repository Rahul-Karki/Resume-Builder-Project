import { describe, expect, it } from "vitest";
import { computePageOffsets, CONTENT_HEIGHT_PX } from "@/utils/resumePagination";

describe("resumePagination", () => {
  it("returns a single page when content fits", () => {
    expect(computePageOffsets(900, CONTENT_HEIGHT_PX, [200, 500])).toEqual([0]);
  });

  it("returns a single page when content is smaller than page height", () => {
    expect(computePageOffsets(500, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });

  it("uses candidate-aligned breaks for multi-page content", () => {
    const candidates = [540, 1100, 1610, 2190, 2780];
    const pageHeight = CONTENT_HEIGHT_PX;
    const offsets = computePageOffsets(3200, pageHeight, candidates);
    expect(offsets[0]).toBe(0);
    expect(offsets.length).toBeGreaterThanOrEqual(2);
    offsets.forEach((o, i) => {
      if (i > 0) expect(o).toBeGreaterThan(offsets[i - 1]);
    });
  });

  it("breaks near the page boundary with few candidates", () => {
    const offsets = computePageOffsets(3500, CONTENT_HEIGHT_PX, []);
    expect(offsets[0]).toBe(0);
    expect(offsets.length).toBeGreaterThanOrEqual(3);
    offsets.forEach((o, i) => {
      if (i > 0) expect(o - offsets[i - 1]).toBeGreaterThanOrEqual(32);
    });
  });

  it("uses a candidate just after ideal break if none before", () => {
    const candidates = [1200, 2400, 3600];
    const offsets = computePageOffsets(5000, CONTENT_HEIGHT_PX, candidates);
    expect(offsets.length).toBeGreaterThanOrEqual(3);
  });

  it("handles edge case of zero height", () => {
    expect(computePageOffsets(0, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });

  it("handles negative height gracefully", () => {
    expect(computePageOffsets(-1, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });
});
