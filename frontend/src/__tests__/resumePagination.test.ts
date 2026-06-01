import { describe, expect, it } from "vitest";
import { computePageOffsets, CONTENT_HEIGHT_PX } from "@/utils/resumePagination";

describe("resumePagination", () => {
  it("returns a single page when content fits", () => {
    expect(computePageOffsets(900, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });

  it("returns a single page when content is smaller than page height", () => {
    expect(computePageOffsets(500, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });

  it("breaks at the last safe candidate before the page boundary", () => {
    /* Ideal break at 1123, last candidate before that is 1050 */
    const offsets = computePageOffsets(2500, CONTENT_HEIGHT_PX, [400, 800, 1050, 1200]);
    expect(offsets[1]).toBe(1050);
  });

  it("falls back to ideal boundary when no candidate in range", () => {
    /* No candidates between 0 and 1123 */
    const offsets = computePageOffsets(2500, CONTENT_HEIGHT_PX, [1200, 2000]);
    expect(offsets[1]).toBe(1123);
  });

  it("slices multi-page content with mixed candidates", () => {
    const offsets = computePageOffsets(3500, CONTENT_HEIGHT_PX, [500, 1100, 1600, 2200, 2800]);
    /* Page 1: last candidate ≤ 1123 → 1100 */
    expect(offsets[1]).toBe(1100);
    /* Page 2: last candidate ≤ 2246 → 2200 */
    expect(offsets[2]).toBe(2200);
    expect(offsets.length).toBe(4);
  });

  it("ensures minimum progress of 32px per page", () => {
    /* Candidate at 50 < 32, should be clamped to cursor + 32 */
    const offsets = computePageOffsets(2000, CONTENT_HEIGHT_PX, [50]);
    expect(offsets[1]).toBeGreaterThanOrEqual(32);
  });

  it("handles edge case of zero height", () => {
    expect(computePageOffsets(0, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });

  it("handles negative height gracefully", () => {
    expect(computePageOffsets(-1, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });
});
