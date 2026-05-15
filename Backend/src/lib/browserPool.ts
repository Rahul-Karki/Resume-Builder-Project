import type { Browser } from "puppeteer";
import { launchPuppeteerBrowser } from "../config/puppeteer";
import { logger } from "../observability";

const POOL_SIZE = 2;
const BROWSER_IDLE_TIMEOUT_MS = 60_000;
const RECYCLE_AFTER_USES = 10;

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
    for (let i = 0; i < POOL_SIZE; i++) {
      try {
        const browser = await launchPuppeteerBrowser();
        this.browsers.push({ browser, uses: 0, lastUsed: Date.now() });
        logger.info({ poolIndex: i }, "Puppeteer browser added to pool");
      } catch (error) {
        logger.error({ error, poolIndex: i }, "Failed to launch Puppeteer browser for pool");
      }
    }

    this.recycleTimer = setInterval(() => {
      this._recycleIdle();
    }, BROWSER_IDLE_TIMEOUT_MS);
  }

  async acquire(): Promise<Browser> {
    // Find the least-used available browser
    const sorted = [...this.browsers].sort((a, b) => a.uses - b.uses);

    for (const entry of sorted) {
      try {
        if (entry.browser.connected) {
          entry.uses += 1;
          entry.lastUsed = Date.now();

          // Recycle if too many uses
          if (entry.uses >= RECYCLE_AFTER_USES) {
            this._recycleBrowser(entry).catch(() => {});
          }

          return entry.browser;
        }
      } catch {
        // Browser disconnected; will be replaced
      }
    }

    // All browsers are stale; replace one and retry
    if (this.browsers.length > 0) {
      const entry = this.browsers[0];
      await this._recycleBrowser(entry);
      try {
        const browser = await launchPuppeteerBrowser();
        this.browsers.push({ browser, uses: 0, lastUsed: Date.now() });
        return browser;
      } catch (error) {
        logger.error({ error }, "Failed to launch replacement browser");
        throw error;
      }
    }

    // Pool is empty, launch fresh
    const browser = await launchPuppeteerBrowser();
    this.browsers.push({ browser, uses: 1, lastUsed: Date.now() });
    return browser;
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
      logger.error({ error }, "Failed to replace recycled browser");
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

export const browserPool = new BrowserPool();
