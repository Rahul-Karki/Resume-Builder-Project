import { describe, it, expect } from "vitest";

describe("resumePagination", () => {
  it("should return [0] for empty content", async () => {
    const { computePageOffsets } = await import("../utils/resumePagination");
    expect(computePageOffsets(0, 1123, [])).toEqual([0]);
    expect(computePageOffsets(-1, 1123, [])).toEqual([0]);
  });

  it("should return [0] when content fits in one page", async () => {
    const { computePageOffsets } = await import("../utils/resumePagination");
    expect(computePageOffsets(500, 1123, [])).toEqual([0]);
    expect(computePageOffsets(1123, 1123, [])).toEqual([0]);
  });

  it("should compute offsets for multi-page content", async () => {
    const { computePageOffsets } = await import("../utils/resumePagination");
    const offsets = computePageOffsets(3000, 1000, [200, 400, 600, 800, 1200, 1400, 2200]);
    expect(offsets[0]).toBe(0);
    expect(offsets.length).toBeGreaterThanOrEqual(3);
    offsets.forEach((o: number) => {
      expect(typeof o).toBe("number");
      expect(o).toBeGreaterThanOrEqual(0);
    });
  });

  it("should prefer candidates near page boundary", async () => {
    const { computePageOffsets } = await import("../utils/resumePagination");
    const offsets = computePageOffsets(2000, 1000, [950, 960, 970, 1800]);
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(960);
  });

  it("should enforce minimum 32px page advance", async () => {
    const { computePageOffsets } = await import("../utils/resumePagination");
    const offsets = computePageOffsets(2000, 1000, [5, 10, 15, 20]);
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBeGreaterThanOrEqual(32);
  });

  it("should not exceed total height", async () => {
    const { computePageOffsets } = await import("../utils/resumePagination");
    const offsets = computePageOffsets(5000, 1000, [500, 1500, 2500, 3500, 4500]);
    offsets.forEach((o: number) => expect(o).toBeLessThanOrEqual(5000));
  });

  it("should handle candidates beyond total height", async () => {
    const { computePageOffsets } = await import("../utils/resumePagination");
    const offsets = computePageOffsets(1500, 1000, [200, 500, 5000]);
    expect(offsets.length).toBeGreaterThanOrEqual(2);
  });
});
