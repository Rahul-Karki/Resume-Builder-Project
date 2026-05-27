import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-23T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return 'just now' for timestamps within the last minute", async () => {
    const { relativeTime } = await import("../utils/relativeTime");
    const now = new Date("2026-05-23T11:59:30Z").toISOString();
    expect(relativeTime(now)).toBe("just now");
  });
  it("should return 'Xm ago' for timestamps within the last hour", async () => {
    const { relativeTime } = await import("../utils/relativeTime");
    const fiveMinAgo = new Date("2026-05-23T11:55:00Z").toISOString();
    expect(relativeTime(fiveMinAgo)).toBe("5m ago");
  });
  it("should return 'Xh ago' for timestamps within the last day", async () => {
    const { relativeTime } = await import("../utils/relativeTime");
    const threeHoursAgo = new Date("2026-05-23T09:00:00Z").toISOString();
    expect(relativeTime(threeHoursAgo)).toBe("3h ago");
  });
  it("should return 'Xd ago' for timestamps within the last week", async () => {
    const { relativeTime } = await import("../utils/relativeTime");
    const twoDaysAgo = new Date("2026-05-21T12:00:00Z").toISOString();
    expect(relativeTime(twoDaysAgo)).toBe("2d ago");
  });
  it("should return a formatted date for older timestamps", async () => {
    const { relativeTime } = await import("../utils/relativeTime");
    const oldDate = new Date("2025-01-15T12:00:00Z").toISOString();
    expect(relativeTime(oldDate)).toMatch(/Jan\s+15,?\s+2025/);
  });
  it("should handle invalid date strings gracefully", async () => {
    const { relativeTime } = await import("../utils/relativeTime");
    expect(relativeTime("not-a-date")).toBe("Invalid Date");
  });
});
