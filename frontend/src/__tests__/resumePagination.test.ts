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

  it("prefers entry breaks in the bottom 25% of the page", () => {
    const candidates: Array<{ offset: number; kind: "entry" | "section" }> = [
      { offset: 950, kind: "section" },
      { offset: 960, kind: "entry" },   // first job entry
      { offset: 1100, kind: "entry" },  // second job entry (waste=23px=2% ≤ 25%)
      { offset: 1300, kind: "section" },
    ];
    const offsets = computePageOffsets(2000, CONTENT_HEIGHT_PX, candidates);
    /* Second job entry (1100) should be preferred */
    expect(offsets[1]).toBe(1100);
  });

  it("uses ideal break when entry break is too far from ideal", () => {
    /* Entry at 800 wastes 323px (29%) > 25% threshold → skip */
    const candidates: Array<{ offset: number; kind: "entry" | "section" }> = [
      { offset: 800, kind: "entry" },
    ];
    const offsets = computePageOffsets(2000, CONTENT_HEIGHT_PX, candidates);
    /* No good entry break, no section break → ideal */
    expect(offsets[1]).toBe(1123);
  });

  it("accepts entry break even when followed by section break", () => {
    /* Entry at 1050 wastes 73px (6.5%) ≤ 25% → accepted as entry break */
    const candidates: Array<{ offset: number; kind: "entry" | "section" }> = [
      { offset: 1050, kind: "entry" },
      { offset: 1110, kind: "section" },
    ];
    const offsets = computePageOffsets(2000, CONTENT_HEIGHT_PX, candidates);
    expect(offsets[1]).toBe(1050);
  });

  it("falls to ideal break when section boundary would waste space", () => {
    /* Only section candidates in window, entry at 200 is too early (< minBreak).
       Section at 1100 wastes 23px (2%) ≤ 5% but gap from 0 to 1100 = 1100 > 30 → rejected.
       Falls to ideal. */
    const candidates: Array<{ offset: number; kind: "entry" | "section" }> = [
      { offset: 200, kind: "entry" },
      { offset: 1100, kind: "section" },
    ];
    const offsets = computePageOffsets(2000, CONTENT_HEIGHT_PX, candidates);
    expect(offsets[1]).toBe(1123);
  });

  it("accepts entry break in bottom quarter even with section later", () => {
    /* Entry at 1000 wastes 123px (11%) ≤ 25% → use it */
    const candidates: Array<{ offset: number; kind: "entry" | "section" }> = [
      { offset: 1000, kind: "entry" },
      { offset: 1200, kind: "section" },
    ];
    const offsets = computePageOffsets(2000, CONTENT_HEIGHT_PX, candidates);
    expect(offsets[1]).toBe(1000);
  });
});
