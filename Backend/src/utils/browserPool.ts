import puppeteer, { Browser, LaunchOptions } from "puppeteer";
import { logger } from "../observability";

interface BrowserPoolConfig {
  poolSize: number;
  launchOptions: LaunchOptions;
  idleTimeout: number; // ms to keep idle browsers alive
}

class BrowserPool {
  private availableBrowsers: Browser[] = [];
  private activeBrowsers = new Set<Browser>();
  private waitingQueue: Array<{
    resolve: (browser: Browser) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private config: BrowserPoolConfig;
  private initialized = false;
  private available = true;
  private closing = false;

  constructor(config: Partial<BrowserPoolConfig> = {}) {
    this.config = {
      poolSize: config.poolSize ?? 3,
      launchOptions: config.launchOptions ?? {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
      idleTimeout: config.idleTimeout ?? 30000,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Sanitize launch args for Windows compatibility
      const args = this.config.launchOptions.args ?? [];
      const sanitizedArgs = args.filter(arg => {
        // Remove Linux-specific args on Windows
        return !["--no-sandbox", "--disable-setuid-sandbox"].includes(arg);
      });

      const launchConfig = {
        ...this.config.launchOptions,
        args: sanitizedArgs,
      };

      for (let i = 0; i < this.config.poolSize; i++) {
        try {
          const browser = await puppeteer.launch(launchConfig);
          this.availableBrowsers.push(browser);
        } catch (browserError) {
          logger.warn(
            { error: browserError, attempt: i + 1, poolSize: this.config.poolSize },
            `Failed to launch browser instance ${i + 1}/${this.config.poolSize}`
          );
          // Continue trying to launch other instances
          if (i === this.config.poolSize - 1) {
            // All instances failed
            throw browserError;
          }
        }
      }

      this.available = true;
      this.initialized = true;
      logger.info(
        { poolSize: this.config.poolSize, availableBrowsers: this.availableBrowsers.length },
        "Browser pool initialized"
      );
    } catch (error) {
      this.available = false;
      this.initialized = true;
      logger.error(
        { error, message: (error as Error)?.message },
        "Browser pool initialization failed; safe PDF export will be unavailable"
      );
    }
  }

  async acquire(): Promise<Browser> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.available) {
      throw new Error("Browser pool is unavailable on this deployment");
    }

    // Return available browser immediately
    if (this.availableBrowsers.length > 0) {
      const browser = this.availableBrowsers.pop()!;
      this.activeBrowsers.add(browser);
      return browser;
    }

    // Queue request if all browsers are busy
    return new Promise<Browser>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = this.waitingQueue.findIndex(
          (item) => item.resolve === resolve
        );
        if (idx !== -1) {
          this.waitingQueue.splice(idx, 1);
        }
        reject(new Error("Browser acquisition timeout"));
      }, 30000); // 30s timeout to get a browser

      this.waitingQueue.push({ resolve, reject, timeout });
    });
  }

  release(browser: Browser): void {
    if (!browser) return;

    this.activeBrowsers.delete(browser);

    // If closing, don't reuse browsers
    if (this.closing) {
      void browser.close().catch((e) =>
        logger.warn({ error: e }, "Error closing browser during pool shutdown")
      );
      return;
    }

    // Serve waiting requests first
    if (this.waitingQueue.length > 0) {
      const item = this.waitingQueue.shift();
      if (item) {
        clearTimeout(item.timeout);
        this.activeBrowsers.add(browser);
        item.resolve(browser);
      } else {
        this.availableBrowsers.push(browser);
      }
    } else {
      this.availableBrowsers.push(browser);
    }
  }

  async close(): Promise<void> {
    if (this.closing) return;
    this.closing = true;

    // Reject all waiting requests
    this.waitingQueue.forEach((item) => {
      clearTimeout(item.timeout);
      item.reject(new Error("Browser pool is closing"));
    });
    this.waitingQueue = [];

    // Close all browsers
    const allBrowsers = [
      ...this.availableBrowsers,
      ...this.activeBrowsers,
    ];

    await Promise.all(
      allBrowsers.map((browser) =>
        browser
          .close()
          .catch((e) =>
            logger.warn({ error: e }, "Error closing browser during shutdown")
          )
      )
    );

    this.availableBrowsers = [];
    this.activeBrowsers.clear();
    this.initialized = false;
    this.available = true;
    logger.info("Browser pool closed");
  }

  isAvailable(): boolean {
    return this.available;
  }

  getStats() {
    return {
      available: this.availableBrowsers.length,
      active: this.activeBrowsers.size,
      waiting: this.waitingQueue.length,
      poolSize: this.config.poolSize,
    };
  }
}

// Singleton instance
const browserPool = new BrowserPool();

export { browserPool, BrowserPool };
