import { describe, it, expect } from "vitest";

describe("queryClient", () => {
  it("should export queryClient and STALE_TIMES", async () => {
    const mod = await import("../lib/queryClient");
    expect(mod.queryClient).toBeDefined();
    expect(mod.STALE_TIMES).toBeDefined();
  });

  it("should have default stale times", async () => {
    const { STALE_TIMES } = await import("../lib/queryClient");
    expect(STALE_TIMES.dashboard).toBe(30000);
    expect(STALE_TIMES.analytics).toBe(60000);
    expect(STALE_TIMES.templates).toBe(120000);
    expect(STALE_TIMES.resumes).toBe(30000);
  });

  it("should create a QueryClient with default options", async () => {
    const { queryClient } = await import("../lib/queryClient");
    expect(queryClient.getDefaultOptions().queries).toBeDefined();
  });

  it("should have retry set to 2", async () => {
    const { queryClient } = await import("../lib/queryClient");
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(2);
  });
});
