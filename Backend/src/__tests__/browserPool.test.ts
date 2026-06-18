import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../config/puppeteer", () => ({
  launchPuppeteerBrowser: vi.fn(),
}));

vi.mock("../observability", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { launchPuppeteerBrowser } from "../config/puppeteer";
import { browserPool, NoBrowserAvailableError } from "../lib/browserPool";

function createMockBrowser() {
  return {
    connected: true,
    close: vi.fn().mockResolvedValue(undefined),
    newPage: vi.fn().mockResolvedValue(undefined),
  };
}

describe("browserPool", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await browserPool.shutdown();
  });

  afterEach(async () => {
    await browserPool.shutdown();
  });

  it("should start with empty pool", () => {
    expect(browserPool.size).toBe(0);
    expect(browserPool.available).toBe(false);
  });

  it("should launch fresh browser when pool is empty", async () => {
    const mockBrowser = createMockBrowser();
    vi.mocked(launchPuppeteerBrowser).mockResolvedValue(mockBrowser as any);

    const browser = await browserPool.acquire();

    expect(browser).toBeDefined();
    expect(browser.connected).toBe(true);
    expect(browserPool.size).toBe(1);
    expect(browserPool.available).toBe(true);
  });

  it("should throw NoBrowserAvailableError when launch fails", async () => {
    vi.mocked(launchPuppeteerBrowser).mockRejectedValue(new Error("Chrome not found"));

    await expect(browserPool.acquire()).rejects.toThrow(NoBrowserAvailableError);
  });

  it("should be available after acquiring a browser", async () => {
    vi.mocked(launchPuppeteerBrowser).mockResolvedValue(createMockBrowser() as any);

    await browserPool.acquire();

    expect(browserPool.available).toBe(true);
    expect(browserPool.size).toBe(1);
  });

  it("should shut down all browsers", async () => {
    const browser1 = createMockBrowser();
    const browser2 = createMockBrowser();
    vi.mocked(launchPuppeteerBrowser)
      .mockResolvedValueOnce(browser1 as any)
      .mockResolvedValueOnce(browser2 as any);

    await browserPool.start();
    await browserPool.shutdown();

    expect(browser1.close).toHaveBeenCalled();
    expect(browser2.close).toHaveBeenCalled();
    expect(browserPool.size).toBe(0);
  });

  it("should handle shutdown with no browsers", async () => {
    await expect(browserPool.shutdown()).resolves.toBeUndefined();
  });

  it("should not be available after shutdown", async () => {
    vi.mocked(launchPuppeteerBrowser).mockResolvedValue(createMockBrowser() as any);

    await browserPool.acquire();
    await browserPool.shutdown();

    expect(browserPool.available).toBe(false);
  });
});
