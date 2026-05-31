import "./instrumentation";
import connectDB from "./config/db";
import "./models";
import { env } from "./config/env";
import { logger, metricsHandler, metricsMiddleware, requestLogger } from "./observability";
import { closeRedisClient, getCacheProvider, warmupCacheBackend } from "./utils/redis";
import { ensureDefaultTemplatesInBackend } from "./bootstrap/defaultTemplates";
import { createAllIndexes } from "./config/indexes";
import { runMigrations } from "./migrations/runner";
import app from "./app";
import { browserPool } from "./lib/browserPool";
import { dataIntegrityChecker } from "./services/dataIntegrityService";
import { keepAliveService } from "./utils/keepAlive";
import { startAtsQueue, stopAtsQueue, recoverAtsJobs } from "./queue/atsQueue";
import { startResumeQueue, stopResumeQueue, recoverResumeJobs } from "./queue/resumeQueue";
const PORT = env.PORT;

const startServer = async () => {
  await connectDB();
  if (env.CREATE_INDEXES_ON_STARTUP) {
    await createAllIndexes();
  }

  // Run pending database migrations — blocking with hard fail on critical failures
  try {
    await runMigrations();
  } catch (error) {
    logger.fatal({ error }, "Migration run failed — aborting startup");
    process.exit(1);
  }

  // Initialize data integrity checker for compliance monitoring
  dataIntegrityChecker.startPeriodicChecks(env.INTEGRITY_CHECK_INTERVAL_MS || 3600000);
  
  await ensureDefaultTemplatesInBackend();

  // Start persistent job queues and recover any pending jobs from before restart
  const atsRecovered = await recoverAtsJobs();
  const resumeRecovered = await recoverResumeJobs();
  if (atsRecovered > 0 || resumeRecovered > 0) {
    logger.info({ atsRecovered, resumeRecovered }, "Recovered pending queue jobs after restart");
  }
  startAtsQueue();
  startResumeQueue();
  const cacheProvider = getCacheProvider();
  // Skip cache warmup when using memory-only cache — avoids wasting a Redis/Upstash PING
  if (cacheProvider !== "none") {
    void warmupCacheBackend().catch((error) => {
      logger.error({ error }, "Cache warmup failed");
    });
  }

  // Pre-warm Puppeteer browser pool for PDF generation
  void browserPool.start().catch((error) => {
    logger.error({ error }, "Puppeteer browser pool warmup failed — PDF downloads will start the browser on first request");
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

    // Initialize keep-alive service after server is running
    // Only enabled when ENABLE_KEEP_ALIVE=true is explicitly set
    if (process.env.ENABLE_KEEP_ALIVE === "true") {
      keepAliveService.initialize({
        url: env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_URL || undefined,
        port: PORT,
        enabled: true,
      });
    }
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

    // Stop keep-alive service
    keepAliveService.stop();

    // Stop data integrity checker
    dataIntegrityChecker.stopPeriodicChecks();

    // Stop job queues
    stopAtsQueue();
    stopResumeQueue();

    // Give in-flight requests time to finish, then force-close remaining connections
    server.closeIdleConnections();

    const shutdownTimer = setTimeout(() => {
      logger.error("Graceful shutdown timeout reached — closing remaining connections");
      server.closeAllConnections();
    }, 25000);

    server.close(async () => {
      clearTimeout(shutdownTimer);
      try {
        await closeRedisClient();
        await browserPool.shutdown();
        logger.info("Shutdown completed successfully");
        process.exit(0);
      } catch (error) {
        logger.error({ error }, "Error during shutdown");
        process.exit(1);
      }
    });
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection — terminating");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception — terminating");
  process.exit(1);
});

void startServer().catch((error) => {
  logger.error({ error }, "Server startup failed");
  process.exit(1);
});
