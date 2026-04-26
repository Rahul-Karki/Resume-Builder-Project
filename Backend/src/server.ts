import "./instrumentation";
import express from "express";
import connectDB from "./config/db";
import { env } from "./config/env";
import cors from "cors";
import helmet from "helmet";
import { csrfProtection } from "./middleware/csrfProtection";
import { logger, metricsHandler, metricsMiddleware, requestLogger } from "./observability";
import { closeRedisClient, getCacheProvider, warmupCacheBackend } from "./utils/redis";
import { ensureDefaultTemplatesInBackend } from "./bootstrap/defaultTemplates";

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
app.use(csrfProtection);
app.use(metricsMiddleware);

if (env.ENABLE_METRICS) {
  app.get(env.METRICS_PATH, metricsHandler);
}

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

const PORT = env.PORT;

const startServer = async () => {
  await connectDB();
  await ensureDefaultTemplatesInBackend();
  const cacheProvider = getCacheProvider();
  void warmupCacheBackend();

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

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down server");
    server.close(async () => {
      await closeRedisClient();
      process.exit(0);
    });
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};

void startServer();

