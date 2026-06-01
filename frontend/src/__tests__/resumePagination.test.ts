import { describe, expect, it } from "vitest";
import { computePageOffsets, CONTENT_HEIGHT_PX } from "@/utils/resumePagination";

/** Helper to build an array of CandidateInfo. */
function ci(offsets: number[]): Array<{ offset: number; kind: "entry" | "section" }> {
  return offsets.map((o) => ({ offset: o, kind: "entry" }));
}

describe("resumePagination", () => {
  it("returns a single page when content fits", () => {
    expect(computePageOffsets(900, CONTENT_HEIGHT_PX, ci([200, 500]))).toEqual([0]);
  });

  it("returns a single page when content is smaller than page height", () => {
    expect(computePageOffsets(500, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });

  it("uses candidate-aligned breaks for multi-page content", () => {
    const candidates = ci([540, 1100, 1610, 2190, 2780]);
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
    const candidates = ci([1200, 2400, 3600]);
    const offsets = computePageOffsets(5000, CONTENT_HEIGHT_PX, candidates);
    expect(offsets.length).toBeGreaterThanOrEqual(3);
  });

  it("handles edge case of zero height", () => {
    expect(computePageOffsets(0, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });

  it("handles negative height gracefully", () => {
    expect(computePageOffsets(-1, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });

  it("prefers entry breaks over section breaks", () => {
    const candidates: Array<{ offset: number; kind: "entry" | "section" }> = [
      { offset: 950, kind: "section" },
      { offset: 960, kind: "entry" },
      { offset: 1100, kind: "entry" },
      { offset: 1300, kind: "section" },
    ];
    const offsets = computePageOffsets(2000, CONTENT_HEIGHT_PX, candidates);
    /* Last entry break (1100) should be preferred over section (1300) */
    expect(offsets[1]).toBe(1100);
  });

  it("accepts any entry break in the page window (≥60%)", () => {
    /* Entry at 800 is ≥ 674 (60% of 1123) → accepted — no wasteRatio gate */
    const candidates: Array<{ offset: number; kind: "entry" | "section" }> = [
      { offset: 800, kind: "entry" },
    ];
    const offsets = computePageOffsets(2000, CONTENT_HEIGHT_PX, candidates);
    expect(offsets[1]).toBe(800);
  });

  it("uses entry break over a later section break", () => {
    const candidates: Array<{ offset: number; kind: "entry" | "section" }> = [
      { offset: 1050, kind: "entry" },
      { offset: 1110, kind: "section" },
    ];
    const offsets = computePageOffsets(2000, CONTENT_HEIGHT_PX, candidates);
    /* Entry at 1050 (≥562) preferred over section at 1110 */
    expect(offsets[1]).toBe(1050);
  });

  it("falls to ideal break when section gap is too large", () => {
    /* Entry at 200 is < 562, section at 1100 ≥ 674 but gap=900 > 30 → reject */
    const candidates: Array<{ offset: number; kind: "entry" | "section" }> = [
      { offset: 200, kind: "entry" },
      { offset: 1100, kind: "section" },
    ];
    const offsets = computePageOffsets(2000, CONTENT_HEIGHT_PX, candidates);
    expect(offsets[1]).toBe(1123);
  });

  it("accepts entry break that fits within the page window", () => {
    const candidates: Array<{ offset: number; kind: "entry" | "section" }> = [
      { offset: 1000, kind: "entry" },
      { offset: 1200, kind: "section" },
    ];
    const offsets = computePageOffsets(2000, CONTENT_HEIGHT_PX, candidates);
    expect(offsets[1]).toBe(1000);
  });
});
