import type { Browser } from "puppeteer";
import { launchPuppeteerBrowser } from "../config/puppeteer";
import { logger } from "../observability";

const POOL_SIZE = 2;
const BROWSER_IDLE_TIMEOUT_MS = 60_000;
const RECYCLE_AFTER_USES = 10;
const MAX_STARTUP_RETRIES = 3;
const RETRY_BACKOFF_MS = 1000; // Initial backoff, exponential from here

class NoBrowserAvailableError extends Error {
  constructor() {
    super("No Puppeteer browser available. Chromium may not be installed.");
    this.name = "NoBrowserAvailableError";
  }
}

class BrowserPool {
  private browsers: { browser: Browser; uses: number; lastUsed: number }[] = [];
  private starting = false;
  private startPromise: Promise<void> | undefined;
  private recycleTimer: ReturnType<typeof setInterval> | null = null;

  async start(): Promise<void> {
    if (this.starting && this.startPromise) return this.startPromise;
    this.starting = true;
    this.startPromise = this._init();
    return this.startPromise;
  }

  private async _init(): Promise<void> {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < POOL_SIZE; i++) {
      let lastError: Error | undefined;
      for (let attempt = 0; attempt < MAX_STARTUP_RETRIES; attempt++) {
        try {
          const browser = await launchPuppeteerBrowser();
          this.browsers.push({ browser, uses: 0, lastUsed: Date.now() });
          logger.info({ poolIndex: i, attempt: attempt + 1 }, "Puppeteer browser added to pool");
          break; // Success, move to next browser
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (attempt < MAX_STARTUP_RETRIES - 1) {
            const backoffMs = RETRY_BACKOFF_MS * Math.pow(2, attempt);
            logger.warn(
              { error, poolIndex: i, attempt: attempt + 1, nextRetryMs: backoffMs },
              "Failed to launch Puppeteer browser, retrying..."
            );
            await wait(backoffMs);
          } else {
            logger.error(
              { error: lastError, poolIndex: i, totalAttempts: MAX_STARTUP_RETRIES },
              "Failed to launch Puppeteer browser after all retries — PDF generation unavailable"
            );
          }
        }
      }
    }

    this.recycleTimer = setInterval(() => {
      this._recycleIdle();
    }, BROWSER_IDLE_TIMEOUT_MS);
  }

  async acquire(): Promise<Browser> {
    const sorted = [...this.browsers].sort((a, b) => a.uses - b.uses);

    for (const entry of sorted) {
      try {
        if (entry.browser.connected) {
          entry.uses += 1;
          entry.lastUsed = Date.now();

          if (entry.uses >= RECYCLE_AFTER_USES) {
            this._recycleBrowser(entry).catch(() => {});
          }

          return entry.browser;
        }
      } catch {
        // Browser disconnected; will be replaced
      }
    }

    // Try to recycle the first stale browser
    if (this.browsers.length > 0) {
      const entry = this.browsers[0];
      await this._recycleBrowser(entry);
      try {
        const browser = await launchPuppeteerBrowser();
        this.browsers.push({ browser, uses: 0, lastUsed: Date.now() });
        return browser;
      } catch (error) {
        logger.error({ error }, "Failed to launch replacement browser — pool empty");
        throw new NoBrowserAvailableError();
      }
    }

    // Pool is empty — try a fresh launch
    try {
      const browser = await launchPuppeteerBrowser();
      this.browsers.push({ browser, uses: 1, lastUsed: Date.now() });
      return browser;
    } catch (error) {
      logger.error({ error }, "Failed to launch initial browser — pool empty");
      throw new NoBrowserAvailableError();
    }
  }

  private async _recycleBrowser(entry: { browser: Browser; uses: number; lastUsed: number }): Promise<void> {
    try {
      await entry.browser.close();
    } catch {
      // ignore
    }
    this.browsers = this.browsers.filter((b) => b !== entry);
    try {
      const browser = await launchPuppeteerBrowser();
      this.browsers.push({ browser, uses: 0, lastUsed: Date.now() });
    } catch (error) {
      logger.warn({ error }, "Failed to replace recycled browser — pool may be degraded");
    }
  }

  private _recycleIdle(): void {
    const now = Date.now();
    for (const entry of [...this.browsers]) {
      if (now - entry.lastUsed > BROWSER_IDLE_TIMEOUT_MS && this.browsers.length > 1) {
        this._recycleBrowser(entry).catch(() => {});
      }
    }
  }

  get size(): number {
    return this.browsers.length;
  }

  get available(): boolean {
    return this.browsers.length > 0;
  }

  async shutdown(): Promise<void> {
    if (this.recycleTimer) {
      clearInterval(this.recycleTimer);
      this.recycleTimer = null;
    }
    await Promise.all(
      this.browsers.map(async (entry) => {
        try {
          await entry.browser.close();
        } catch {
          // ignore
        }
      }),
    );
    this.browsers = [];
  }
}

export { NoBrowserAvailableError };
export const browserPool = new BrowserPool();
