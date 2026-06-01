import { describe, expect, it } from "vitest";
import { computePageOffsets, CONTENT_HEIGHT_PX } from "@/utils/resumePagination";

describe("resumePagination", () => {
  /* ─── Basic edge cases ────────────────────────────────── */

  it("returns a single page when content fits", () => {
    expect(computePageOffsets(900, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });

  it("returns a single page when content is smaller than page height", () => {
    expect(computePageOffsets(500, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });

  it("handles zero height gracefully", () => {
    expect(computePageOffsets(0, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });

  it("handles negative height gracefully", () => {
    expect(computePageOffsets(-1, CONTENT_HEIGHT_PX, [])).toEqual([0]);
  });

  /* ─── No candidates — fallback to ideal boundary ──────── */

  it("falls back to ideal boundary when no candidate in range", () => {
    const offsets = computePageOffsets(2500, CONTENT_HEIGHT_PX, []);
    expect(offsets[1]).toBe(1123);
    expect(offsets[2]).toBe(2246);
    expect(offsets.length).toBe(3);
  });

  it("falls back to ideal boundary when candidates are after the page edge", () => {
    const offsets = computePageOffsets(2500, CONTENT_HEIGHT_PX, [1200, 2000]);
    expect(offsets[1]).toBe(1123);
  });

  /* ─── Single candidate per page ───────────────────────── */

  it("breaks at a single candidate before the page boundary", () => {
    const offsets = computePageOffsets(2500, CONTENT_HEIGHT_PX, [1050, 2050]);
    expect(offsets[1]).toBe(1050);
    expect(offsets[2]).toBe(2050);
  });

  it("breaks at the last safe candidate before the page boundary", () => {
    const offsets = computePageOffsets(2500, CONTENT_HEIGHT_PX, [400, 800, 1050, 1200]);
    expect(offsets[1]).toBe(1050);
  });

  /* ─── Multi-page with mixed candidates ────────────────── */

  it("slices multi-page content with mixed candidates", () => {
    const offsets = computePageOffsets(3500, CONTENT_HEIGHT_PX, [500, 1100, 1600, 2200, 2800]);
    /* Page 1: last candidate ≤ 1123 → 1100 */
    expect(offsets[1]).toBe(1100);
    /* Page 2: last candidate ≤ 2246 → 2200 */
    expect(offsets[2]).toBe(2200);
    expect(offsets.length).toBe(4);
  });

  it("uses the closest candidate to the page boundary", () => {
    /* Entry top at 700 but fine-grained bullets at 950, 1020 → break at 1020 */
    const offsets = computePageOffsets(2500, CONTENT_HEIGHT_PX, [700, 950, 1020]);
    expect(offsets[1]).toBe(1020);
  });

  /* ─── Realistic resume scenarios ──────────────────────── */

  it("breaks between bullet points near the page bottom", () => {
    /* Resume with 3 entries. Entry 1: 0-400, Entry 2: 400-800, Entry 3: 800-1400.
       Bullets in entry 3: [820, 850, 880, 910, 940, 970, 1000, 1030] */
    const candidates = [400, 800, 820, 850, 880, 910, 940, 970, 1000, 1030, 1400];
    const offsets = computePageOffsets(2500, CONTENT_HEIGHT_PX, candidates);
    /* Last candidate ≤ 1123 → 1030 (last bullet), not 800 (entry 3 top) */
    expect(offsets[1]).toBe(1030);
  });

  it("breaks within a long entry, not pushing entire entry to next page", () => {
    /* Single long entry spanning 100-2000 with bullets every 30px.
       Without fine-grained candidates, the break would be at 100 (entry top).
       With bullets, it should break near the page bottom. */
    const candidates: number[] = [];
    for (let i = 100; i <= 2000; i += 30) candidates.push(i);
    const offsets = computePageOffsets(4000, CONTENT_HEIGHT_PX, candidates);
    /* Page 1: last candidate ≤ 1123 → ~1090 (1123 - 33), within 30px of bottom */
    const gap = 1123 - offsets[1];
    expect(gap).toBeLessThanOrEqual(120); /* At most a few bullets' worth of space */
  });

  it("keeps headings with their following content when possible (multi-page)", () => {
    /* Section at 0-100, heading at 100, entries 150-600, then a new section.
       Section 2 heading at 800, then detailed content. */
    const candidates = [0, 100, 150, 300, 450, 600, 800, 850, 950, 1050, 1150, 1250];
    const offsets = computePageOffsets(3000, CONTENT_HEIGHT_PX, candidates);
    /* Page 1: last candidate ≤ 1123 → 1050 or 1150. If 1050 is last, break there. */
    expect(offsets[1]).toBeGreaterThan(800); /* Should not break before section 2 heading */
  });

  /* ─── Minimum progress safeguard ──────────────────────── */

  it("ensures minimum progress of 32px per page", () => {
    const offsets = computePageOffsets(2000, CONTENT_HEIGHT_PX, [50]);
    expect(offsets[1]).toBeGreaterThanOrEqual(32);
  });

  it("clamps break to total height when near the end", () => {
    const offsets = computePageOffsets(1200, CONTENT_HEIGHT_PX, [1100]);
    /* Page 1: last candidate ≤ 1123 → 1100. Next ideal = 2223 ≥ 1200 → done */
    expect(offsets[1]).toBe(1100);
    expect(offsets.length).toBe(2);
  });

  /* ─── Content barely overflowing a single page ────────── */

  it("creates 2 pages when content barely overflows", () => {
    /* 1130px total, just 7px overflow */
    const offsets = computePageOffsets(1130, CONTENT_HEIGHT_PX, [1100]);
    expect(offsets.length).toBe(2);
    expect(offsets[1]).toBe(1100);
  });

  it("creates correct number of pages for large content", () => {
    const totalHeight = 5000;
    const expectedFullPages = Math.ceil(totalHeight / CONTENT_HEIGHT_PX);
    const offsets = computePageOffsets(totalHeight, CONTENT_HEIGHT_PX, []);
    expect(offsets.length).toBe(expectedFullPages);
  });

  /* ─── Consumed candidates are not reused ──────────────── */

  it("does not reuse candidates from previous pages", () => {
    /* Candidates at [600, 1100, 1200, 1700]
       Page 1: last ≤ 1123 → 1100, cursor=1100
       Page 2: candidates > 1100 and ≤ 2246 → 1200, 1700. Last: 1700 */
    const offsets = computePageOffsets(3500, CONTENT_HEIGHT_PX, [600, 1100, 1200, 1700]);
    expect(offsets[1]).toBe(1100);
    expect(offsets[2]).toBe(1700);
  });

  /* ─── Sorted input handling ───────────────────────────── */

  it("handles unsorted candidate input", () => {
    const offsets = computePageOffsets(2500, CONTENT_HEIGHT_PX, [1100, 800, 400, 1050, 600]);
    expect(offsets[1]).toBe(1100);
  });

  /* ─── Duplicates in input ─────────────────────────────── */

  it("handles duplicate candidate offsets", () => {
    const offsets = computePageOffsets(2500, CONTENT_HEIGHT_PX, [800, 800, 1050, 1050, 1200]);
    expect(offsets[1]).toBe(1050);
  });
});
