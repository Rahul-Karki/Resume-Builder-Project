import "./instrumentation";
import connectDB from "./config/db";
import { env } from "./config/env";
import { flushBackendSentry, initializeBackendSentry } from "./config/sentry";
import { logger, metricsHandler, metricsMiddleware, requestLogger } from "./observability";
import { closeRedisClient, getCacheProvider, warmupCacheBackend } from "./utils/redis";
import { closeAtsQueue, ensureAtsQueueReady } from "./queue/atsQueue";
import { closeResumeQueue, ensureResumeQueueReady } from "./queue/resumeQueue";
import { ensureDefaultTemplatesInBackend } from "./bootstrap/defaultTemplates";
import { createAllIndexes } from "./config/indexes";
import app from "./app";
import { initResumeQueueEvents, closeResumeQueueEvents } from "./queue/resumeQueueEvents";
import { browserPool } from "./lib/browserPool";
import { dataIntegrityChecker } from "./services/dataIntegrityService";
initializeBackendSentry();

const PORT = env.PORT;

const startServer = async () => {
  await connectDB();
  await createAllIndexes();
  
  // Initialize data integrity checker for compliance monitoring
  dataIntegrityChecker.startPeriodicChecks(env.INTEGRITY_CHECK_INTERVAL_MS || 3600000);
  
  await ensureDefaultTemplatesInBackend();
  const cacheProvider = getCacheProvider();
  // Skip cache warmup when using memory-only cache — avoids wasting a Redis/Upstash PING
  if (cacheProvider !== "none") {
    void warmupCacheBackend().catch((error) => {
      logger.error({ error }, "Cache warmup failed");
    });
  }
  void ensureResumeQueueReady().catch((error) => {
    logger.error({ error }, "Resume queue connection failed during startup");
  });
  // Initialize queue events to propagate job updates to SSE subscribers
  try {
    initResumeQueueEvents();
  } catch (err) {
    logger.warn({ err }, "Failed to init resume queue events (non-fatal)");
  }
  void ensureAtsQueueReady().catch((error) => {
    logger.error({ error }, "ATS queue connection failed during startup");
  });

  // Pre-warm Puppeteer browser pool for PDF generation
  void browserPool.start().catch((error) => {
    logger.error({ error }, "Puppeteer browser pool warmup failed");
  });

  const server = app.listen(PORT, () => {
    logger.info(
      {
        port: PORT,
        metricsEnabled: env.ENABLE_METRICS,
        metricsPath: env.METRICS_PATH,
        cacheProvider,
        cacheConfigured: cacheProvider !== "none",
      },
      "Server started",
    );
  });

  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    // Prevent multiple shutdown attempts
    if (isShuttingDown) {
      logger.warn({ signal }, "Shutdown already in progress");
      return;
    }

    isShuttingDown = true;
    logger.info({ signal }, "Shutting down server");

    // Stop data integrity checker
    dataIntegrityChecker.stopPeriodicChecks();

    // Stop accepting new connections
    server.close(async () => {
      try {
        await closeRedisClient();
        // Close QueueEvents bridge if initialized
        try {
          await closeResumeQueueEvents();
        } catch (err) {
          logger.warn({ err }, "Error closing resume queue events");
        }
        await closeResumeQueue();
        await closeAtsQueue();
        await browserPool.shutdown();
        logger.info("Shutdown completed successfully");
        process.exit(0);
      } catch (error) {
        logger.error({ error }, "Error during shutdown");
        process.exit(1);
      }
    });

    // Force shutdown after timeout (default 30s)
    const shutdownTimeout = setTimeout(() => {
      logger.error("Graceful shutdown timeout, forcing exit");
      process.exit(1);
    }, 30000);

    // Clear timeout if shutdown completes
    server.once("close", () => clearTimeout(shutdownTimeout));
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
    void flushBackendSentry();
});

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception");
    void flushBackendSentry();
});

void startServer().catch((error) => {
  logger.error({ error }, "Server startup failed");
  process.exit(1);
});

