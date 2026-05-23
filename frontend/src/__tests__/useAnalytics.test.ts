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
    mockApi.get.mockResolvedValue({ data: { ok: true, data: [] } });
    const { useAnalytics } = await import("../hooks/useAnalytics");
    const { result } = renderHook(() => useAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });
  it("should refetch when the period changes", async () => {
    mockApi.get.mockResolvedValue({ data: { ok: true, data: [] } });
    const { useAnalytics } = await import("../hooks/useAnalytics");
    const { result, rerender } = renderHook((p: 7 | 30 = 30) => useAnalytics(p), { initialProps: 7 });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callCount = mockApi.get.mock.calls.length;
    rerender(30);
    await waitFor(() => expect(mockApi.get.mock.calls.length).toBeGreaterThan(callCount));
  });
  it("should return template analytics data", async () => {
    mockApi.get.mockResolvedValue({ data: { ok: true, data: [{ _id: "t1", name: "Classic", status: "published", weeklyUses: 10, monthlyUses: 50 }] } });
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
