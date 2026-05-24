import { describe, expect, it } from "vitest";
import { computePageOffsets } from "../utils/resumePagination";

describe("resumePagination", () => {
  it("returns a single page when content fits", () => {
    expect(computePageOffsets(900, 1123, [200, 500])).toEqual([0]);
  });

  it("uses section-aligned candidates near ideal breakpoints", () => {
    const offsets = computePageOffsets(3200, 1123, [540, 1100, 1610, 2190, 2780]);
    expect(offsets).toEqual([0, 1100, 2190]);
  });

  it("falls back to fixed-height pagination when no candidates exist", () => {
    const offsets = computePageOffsets(3500, 1123, []);
    expect(offsets).toEqual([0, 1123, 2246, 3369]);
  });
});
