import "./instrumentation";
import express from "express";
import connectDB from "./config/db";
import { env } from "./config/env";
import cors from "cors";
import helmet from "helmet";
import { csrfProtection } from "./middleware/csrfProtection";
import { correlationIdMiddleware } from "./middleware/correlationId";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestTimeoutMiddleware } from "./middleware/requestTimeout";
import { logger, metricsHandler, metricsMiddleware, requestLogger } from "./observability";
import { closeRedisClient, getCacheProvider, warmupCacheBackend } from "./utils/redis";
import { ensureDefaultTemplatesInBackend } from "./bootstrap/defaultTemplates";
import { browserPool } from "./utils/browserPool";
import { openAPISpec } from "./config/openapi";
import { createAllIndexes } from "./config/indexes";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

const configuredOrigins = [
  env.FRONTEND_URL,
  ...env.FRONTEND_URLS,
]
  .map((origin) => origin?.trim())
  .filter((origin): origin is string => Boolean(origin));

app.use(express.json());
app.use(correlationIdMiddleware);
app.use(requestLogger);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (configuredOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed by CORS policy"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token"],
};

app.use(helmet({
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "no-referrer" },
  crossOriginResourcePolicy: { policy: "same-site" },
}));
app.use(cors(corsOptions));
app.use(requestTimeoutMiddleware);
app.use(csrfProtection);
app.use(metricsMiddleware);

if (env.ENABLE_METRICS) {
  app.get(env.METRICS_PATH, metricsHandler);
}

// OpenAPI documentation
app.get("/api/docs", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json(openAPISpec);
});

// Redirect /api/docs-ui to Swagger UI (if available)
// To use Swagger UI: npm install swagger-ui-express
// Then uncomment: import swaggerUI from "swagger-ui-express";
// app.use("/api/docs-ui", swaggerUI.serve, swaggerUI.setup(openAPISpec));

import authRoutes from "./router/auth.routes";
import refreshRoutes from "./router/refresh.route";
import resumeRoutes from "./router/resume.routes";
import adminRoutes from "./router/admin.routes";
import templateRoutes from "./router/template.routes";
import healthRoutes from "./router/health.routes";

app.use("/api/auth",authRoutes);
app.use("/api",refreshRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/templates", templateRoutes);
app.use("/health", healthRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = env.PORT;

const startServer = async () => {
  await connectDB();
  await createAllIndexes();
  await ensureDefaultTemplatesInBackend();
  await browserPool.initialize();
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
        await browserPool.close();
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
});

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception");
});

void startServer().catch((error) => {
  logger.error({ error }, "Server startup failed");
  process.exit(1);
});

