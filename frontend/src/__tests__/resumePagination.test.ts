import { describe, expect, it } from "vitest";
import { computePageOffsets } from "../utils/resumePagination";

const emptyCandidates = { section: [], entry: [], fine: [] };

describe("resumePagination", () => {
  it("returns a single page when content fits", () => {
    expect(computePageOffsets(900, 1123, { section: [200, 500], entry: [], fine: [] })).toEqual([0]);
  });

  it("uses section-aligned candidates near ideal breakpoints", () => {
    const offsets = computePageOffsets(3200, 1123, {
      section: [540, 1100, 1610, 2190, 2780],
      entry: [],
      fine: [],
    });
    expect(offsets).toEqual([0, 1100, 2190]);
  });

  it("falls back to fixed-height pagination when no candidates exist", () => {
    const offsets = computePageOffsets(3500, 1123, emptyCandidates);
    expect(offsets).toEqual([0, 1123, 2246, 3369]);
  });
});
