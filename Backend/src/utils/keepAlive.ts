import http from "http";
import https from "https";
import { logger } from "../observability";

const KEEP_ALIVE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const KEEP_ALIVE_ENDPOINT = "/api/health";
const KEEP_ALIVE_TIMEOUT_MS = 10000; // 10 seconds

interface KeepAliveConfig {
  url?: string;
  port?: number;
  host?: string;
  protocol?: string;
  enabled?: boolean;
}

class KeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private fullUrl: string | null = null;
  private isShuttingDown = false;

  initialize(config: KeepAliveConfig = {}): void {
    // Only enable keep-alive in production or when explicitly configured
    const shouldEnable = config.enabled ?? process.env.NODE_ENV === "production";

    if (!shouldEnable) {
      logger.debug("Keep-alive service disabled");
      return;
    }

    // Determine full URL: prioritize explicit config URL, then BACKEND_URL env var, fallback to local
    if (config.url) {
      this.fullUrl = config.url;
    } else if (process.env.BACKEND_URL) {
      this.fullUrl = process.env.BACKEND_URL;
    } else {
      const port = config.port ?? parseInt(process.env.BACKEND_PORT || process.env.PORT || "5000", 10);
      const host = config.host ?? process.env.BACKEND_HOST ?? "localhost";
      const protocol = config.protocol ?? process.env.BACKEND_PROTOCOL ?? "http";
      this.fullUrl = `${protocol}://${host}:${port}`;
    }

    // Ensure we have a full URL with protocol
    if (this.fullUrl && !this.fullUrl.startsWith("http")) {
      this.fullUrl = `http://${this.fullUrl}`;
    }

    // Warn if we're in production but don't have a public URL
    const isLocalhost = this.fullUrl?.includes("localhost") || this.fullUrl?.includes("127.0.0.1");
    if (isLocalhost && process.env.NODE_ENV === "production") {
      logger.warn(
        "Keep-alive pinging localhost — this will NOT keep the service alive. " +
        "Set BACKEND_URL to the public URL for effective keep-alive.",
      );
    }

    const healthCheckUrl = this.fullUrl ? `${this.fullUrl}${KEEP_ALIVE_ENDPOINT}` : null;

    if (!healthCheckUrl) {
      logger.warn("Could not determine backend URL for keep-alive service");
      return;
    }

    logger.info(
      { url: healthCheckUrl, intervalSeconds: KEEP_ALIVE_INTERVAL_MS / 1000 },
      "Keep-alive service initialized",
    );

    // Perform initial ping after 30 seconds to let server stabilize
    setTimeout(() => {
      this.ping(healthCheckUrl);
    }, 30000);

    // Start recurring pings
    this.intervalId = setInterval(() => {
      this.ping(healthCheckUrl);
    }, KEEP_ALIVE_INTERVAL_MS);
  }

  private ping(url: string): void {
    if (this.isShuttingDown) {
      return;
    }

    const isHttps = url.startsWith("https");
    const client = isHttps ? https : http;
    const startTime = Date.now();

    const request = client.get(url, { timeout: KEEP_ALIVE_TIMEOUT_MS }, (res) => {
      const duration = Date.now() - startTime;
      const statusOk = res.statusCode && res.statusCode >= 200 && res.statusCode < 400;

      // Consume the response body
      res.on("data", () => {});
      res.on("end", () => {
        if (statusOk) {
          logger.debug(
            { statusCode: res.statusCode, durationMs: duration },
            "Keep-alive ping successful",
          );
        } else {
          logger.warn(
            { statusCode: res.statusCode, durationMs: duration },
            "Keep-alive ping returned unexpected status",
          );
        }
      });
    });

    request.on("error", (error) => {
      logger.error(
        { error: error.message, duration: Date.now() - startTime },
        "Keep-alive ping failed",
      );
    });

    request.on("timeout", () => {
      request.destroy();
      logger.warn({ url }, "Keep-alive ping timed out");
    });
  }

  stop(): void {
    if (this.intervalId) {
      this.isShuttingDown = true;
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("Keep-alive service stopped");
    }
  }
}

export const keepAliveService = new KeepAliveService();
