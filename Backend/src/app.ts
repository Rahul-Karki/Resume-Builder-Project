import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { csrfProtection } from "./middleware/csrfProtection";
import { correlationIdMiddleware } from "./middleware/correlationId";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestTimeoutMiddleware } from "./middleware/requestTimeout";
import { logger, metricsHandler, metricsMiddleware, requestLogger } from "./observability";
import { openAPISpec } from "./config/openapi";

import authRoutes from "./router/auth.routes";
import refreshRoutes from "./router/refresh.route";
import resumeRoutes from "./router/resume.routes";
import adminRoutes from "./router/admin.routes";
import templateRoutes from "./router/template.routes";
import healthRoutes from "./router/health.routes";

export const createApp = () => {
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

  app.get("/api/docs", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(openAPISpec);
  });

  app.use("/api/auth", authRoutes);
  app.use("/api", refreshRoutes);
  app.use("/api/resumes", resumeRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/templates", templateRoutes);
  app.use("/health", healthRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const app = createApp();

export default app;