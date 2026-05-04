import "./instrumentation";
import connectDB from "./config/db";
import { env } from "./config/env";
import { flushBackendSentry, initializeBackendSentry } from "./config/sentry";
import { logger, metricsHandler, metricsMiddleware, requestLogger } from "./observability";
import { closeRedisClient, getCacheProvider, warmupCacheBackend } from "./utils/redis";
import { ensureDefaultTemplatesInBackend } from "./bootstrap/defaultTemplates";
import { createAllIndexes } from "./config/indexes";
import app from "./app";
initializeBackendSentry();

const PORT = env.PORT;

const startServer = async () => {
  await connectDB();
  await createAllIndexes();
  await ensureDefaultTemplatesInBackend();
  const cacheProvider = getCacheProvider();
  void warmupCacheBackend().catch((error) => {
    logger.error({ error }, "Cache warmup failed");
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

    // Stop accepting new connections
    server.close(async () => {
      try {
        await closeRedisClient();
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

