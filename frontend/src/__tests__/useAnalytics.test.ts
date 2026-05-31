import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockApi = {
  get: vi.fn(),
};

vi.mock("@/services/api", () => ({ api: mockApi }));

describe("useAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch dashboard stats on mount", async () => {
    mockApi.get
      .mockResolvedValueOnce({
        data: {
          ok: true,
          data: {
            totalUsers: 7,
            totalTemplates: 2,
            publishedTemplates: 1,
            draftTemplates: 1,
            premiumTemplates: 0,
            totalUsesThisWeek: 4,
            totalUsesThisMonth: 18,
            mostUsed: null,
            leastUsed: null,
          },
        },
      })
      .mockResolvedValueOnce({ data: { ok: true, data: [] } });
    const { useAnalytics } = await import("../hooks/useAnalytics");
    const { result } = renderHook(() => useAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).toHaveBeenCalledTimes(2);
    expect(result.current.stats?.totalUsers).toBe(7);
  });
  it("should refetch when the period changes", async () => {
    mockApi.get
      .mockResolvedValueOnce({
        data: {
          ok: true,
          data: {
            totalUsers: 0,
            totalTemplates: 0,
            publishedTemplates: 0,
            draftTemplates: 0,
            premiumTemplates: 0,
            totalUsesThisWeek: 0,
            totalUsesThisMonth: 0,
            mostUsed: null,
            leastUsed: null,
          },
        },
      })
      .mockResolvedValueOnce({ data: { ok: true, data: [] } });
    const { useAnalytics } = await import("../hooks/useAnalytics");
    const { result, rerender } = renderHook((p: 7 | 30 = 30) => useAnalytics(p), { initialProps: 7 });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callCount = mockApi.get.mock.calls.length;
    rerender(30);
    await waitFor(() => expect(mockApi.get.mock.calls.length).toBeGreaterThan(callCount));
  });
  it("should return template analytics data", async () => {
    mockApi.get
      .mockResolvedValueOnce({
        data: {
          ok: true,
          data: {
            totalUsers: 0,
            totalTemplates: 0,
            publishedTemplates: 0,
            draftTemplates: 0,
            premiumTemplates: 0,
            totalUsesThisWeek: 0,
            totalUsesThisMonth: 0,
            mostUsed: null,
            leastUsed: null,
          },
        },
      })
      .mockResolvedValueOnce({ data: { ok: true, data: [{ templateId: "t1", name: "Classic", status: "published", weeklyUses: 10, monthlyUses: 50, daily: [], trend: "stable" }] } });
    const { useAnalytics } = await import("../hooks/useAnalytics");
    const { result } = renderHook(() => useAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats).toBeDefined();
  });
  it("should set error when the fetch fails", async () => {
    mockApi.get.mockRejectedValue(new Error("Failed to fetch"));
    const { useAnalytics } = await import("../hooks/useAnalytics");
    const { result } = renderHook(() => useAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});
