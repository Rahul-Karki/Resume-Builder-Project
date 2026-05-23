import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mockRequestManager = {
  createRequest: vi.fn().mockReturnValue({ requestId: "req-1", controller: { signal: new AbortController().signal } }),
  completeRequest: vi.fn(),
  cancelAll: vi.fn(),
  getRequestKey: vi.fn().mockReturnValue("key"),
  isRequestInFlight: vi.fn().mockReturnValue(false),
  getActiveRequests: vi.fn().mockReturnValue([]),
};

vi.mock("../hooks/useRequestManager", () => ({
  useRequestManager: () => mockRequestManager,
}));

describe("useAISuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return a suggestion when improveText succeeds", async () => {
    const { useAISuggestions } = await import("../hooks/useAISuggestions");
    const { result } = renderHook(() => useAISuggestions());

    act(() => {
      result.current.requestSuggestions(
        vi.fn().mockResolvedValue({ improvedText: "Enhanced text" }),
        { text: "test" },
        "field-1",
        "improve-text",
      );
    });

    vi.advanceTimersByTime(600);
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.suggestions).toBeNull();
  });
  it("should set loading to true while the request is in flight", async () => {
    const { useAISuggestions } = await import("../hooks/useAISuggestions");
    const { result } = renderHook(() => useAISuggestions());

    act(() => {
      result.current.requestSuggestions(
        vi.fn().mockImplementation(() => new Promise(() => {})),
        { text: "test" },
        "field-1",
        "improve-text",
      );
    });

    expect(result.current.state.loading).toBe(true);
    vi.advanceTimersByTime(600);
  });
  it("should set error when the request fails", async () => {
    const { useAISuggestions } = await import("../hooks/useAISuggestions");
    const { result } = renderHook(() => useAISuggestions());

    act(() => {
      result.current.requestSuggestions(
        vi.fn().mockRejectedValue({ message: "API Error", response: { status: 500 } }),
        { text: "test" },
        "field-1",
        "improve-text",
      );
    });

    vi.advanceTimersByTime(600);
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.error).toBeTruthy();
  });
  it("should cancel the previous request when a new one is made", async () => {
    const { useAISuggestions } = await import("../hooks/useAISuggestions");
    const { result } = renderHook(() => useAISuggestions());

    act(() => {
      result.current.requestSuggestions(vi.fn(), { text: "first" }, "field-1", "improve-text");
    });

    act(() => {
      result.current.cancelSuggestions("field-1");
    });

    expect(result.current.state.loading).toBe(false);
    expect(result.current.suggestions).toBeNull();
  });
  it("should debounce rapid consecutive calls", async () => {
    const { useAISuggestions } = await import("../hooks/useAISuggestions");
    const requestFn = vi.fn().mockResolvedValue({ improvedText: "text" });
    const { result } = renderHook(() => useAISuggestions({ debounceMs: 500 }));

    act(() => { result.current.requestSuggestions(requestFn, { text: "a" }, "f1", "improve-text"); });
    act(() => { result.current.requestSuggestions(requestFn, { text: "b" }, "f1", "improve-text"); });
    act(() => { result.current.requestSuggestions(requestFn, { text: "c" }, "f1", "improve-text"); });

    vi.advanceTimersByTime(600);
    await waitFor(() => expect(result.current.state.loading).toBe(false));
  });
  it("should clear state on reset", async () => {
    const { useAISuggestions } = await import("../hooks/useAISuggestions");
    const { result } = renderHook(() => useAISuggestions());

    act(() => { result.current.cancelSuggestions("field-1"); });
    expect(result.current.state.error).toBeNull();
    expect(result.current.suggestions).toBeNull();
  });
});
