import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

describe("useViewport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return true when window width is below breakpoint", async () => {
    globalThis.innerWidth = 500;
    const { useViewport } = await import("../hooks/useViewport");
    const { result } = renderHook(() => useViewport(768));
    expect(result.current).toBe(true);
  });

  it("should return false when window width is above breakpoint", async () => {
    globalThis.innerWidth = 1024;
    const { useViewport } = await import("../hooks/useViewport");
    const { result } = renderHook(() => useViewport(768));
    expect(result.current).toBe(false);
  });

  it("should update on resize", async () => {
    globalThis.innerWidth = 1024;
    const { useViewport } = await import("../hooks/useViewport");
    const { result } = renderHook(() => useViewport(768));

    expect(result.current).toBe(false);

    act(() => {
      globalThis.innerWidth = 500;
      globalThis.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(true);
  });

  it("should use custom breakpoint", async () => {
    globalThis.innerWidth = 600;
    const { useViewport } = await import("../hooks/useViewport");
    const { result } = renderHook(() => useViewport(500));
    expect(result.current).toBe(false);

    const { result: result2 } = renderHook(() => useViewport(700));
    expect(result2.current).toBe(true);
  });
});
