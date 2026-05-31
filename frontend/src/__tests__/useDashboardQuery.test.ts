import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

const mockApi = {
  get: vi.fn(),
};

vi.mock("@/services/api", () => ({ api: mockApi }));

describe("useDashboardStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return ({ children }: { children: unknown }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
  };

  it("returns live empty data when the backend has no analytics", async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { ok: true, data: { totalUsers: 0, totalTemplates: 0, publishedTemplates: 0, draftTemplates: 0, premiumTemplates: 0, totalUsesThisWeek: 0, totalUsesThisMonth: 0, mostUsed: null, leastUsed: null } } })
      .mockResolvedValueOnce({ data: { ok: true, data: [] } });

    const { useDashboardStats } = await import("../hooks/useDashboardQuery");
    const { result } = renderHook(() => useDashboardStats(30), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.stats.totalUsers).toBe(0);
    expect(result.current.data?.stats.totalTemplates).toBe(0);
    expect(result.current.data?.analytics).toEqual([]);
  });
});