import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env";
import apiVersionMiddleware from "./middleware/apiVersion";
import { csrfProtection } from "./middleware/csrfProtection";
import { correlationIdMiddleware } from "./middleware/correlationId";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestTimeoutMiddleware } from "./middleware/requestTimeout";
import { requestSizeLimitMiddleware } from "./middleware/requestSizeLimit";
import { logger, metricsHandler, metricsMiddleware, requestLogger } from "./observability";
import { openAPISpec } from "./config/openapi";
import { auditContextMiddleware, referentialIntegrityMiddleware } from "./middleware/referentialIntegrity";

import authRoutes from "./router/auth.routes";
import refreshRoutes from "./router/refresh.route";
import resumeRoutes from "./router/resume.routes";
import aiRoutes from "./router/ai.routes";
import adminRoutes from "./router/admin.routes";
import templateRoutes from "./router/template.routes";
import healthRoutes from "./router/health.routes";
import { adminGuard } from "./middleware/adminAuthMiddleware";

export const createApp = () => {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  const configuredOrigins = [
    env.FRONTEND_URL,
    ...env.FRONTEND_URLS,
  ]
    .map((origin) => origin?.trim().replace(/\/$/, ""))
    .filter((origin): origin is string => Boolean(origin));

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) {
        // In production, only allow safe methods without Origin header
        // (e.g., health checks). Mutating requests from non-browser clients
        // still require authentication and rate limiting.
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.trim().replace(/\/$/, "");

      if (configuredOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      // Allow Vercel preview deployments and custom domains
      if (
        normalizedOrigin.endsWith(".vercel.app") ||
        normalizedOrigin.endsWith(".onrender.com") ||
        normalizedOrigin.startsWith("http://localhost:") ||
        normalizedOrigin.startsWith("https://localhost:")
      ) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS policy"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "X-CSRF-Token",
      "X-Request-ID",
      "X-Requested-With",
      "X-XSRF-Token",
      "Authorization",
    ],
    exposedHeaders: [
      "X-CSRF-Token",
      "x-ai-cached",
      "x-ai-fallback",
      "x-ai-provider",
      "x-ai-model",
      "x-ai-credits-estimated",
      "x-ai-credits-deducted",
      "x-ai-credits-remaining",
      "x-ai-credits-reset-at",
      "x-ai-credits-plan",
    ],
  };

  // 1. CORS MUST come first to handle preflight and error responses
  app.use(cors(corsOptions));

  // 2. Compression middleware to reduce response payload size
  app.use(compression({
    level: 6, // balance between compression ratio and CPU usage
    threshold: 1024, // only compress responses larger than 1KB
  }));

  // 3. Helmet for security headers
  app.use(helmet({
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Enabled cross-origin access
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://accounts.google.com"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", "https://*.googleusercontent.com"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "https://*.ingest.sentry.io", "https://accounts.google.com"],
        frameSrc: ["'self'", "https://accounts.google.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }));

  // 4. Global instrumentation and size checks before body parsing
  app.use(correlationIdMiddleware);
  app.use(auditContextMiddleware);
  app.use(requestSizeLimitMiddleware);
  
  // 5. Body parsing
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
  
  // 6. Logging and processing
  app.use(requestLogger);
  app.use(apiVersionMiddleware);
  app.use(requestTimeoutMiddleware);
  app.use(csrfProtection);
  app.use(referentialIntegrityMiddleware);
  app.use(metricsMiddleware);

  if (env.ENABLE_METRICS) {
    app.get(env.METRICS_PATH, metricsHandler);
  }

  app.get("/api/docs", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(openAPISpec);
  });

  // Versioned API routes — accept header negotiation
  // Clients can use Accept: application/vnd.resume-builder.v1+json
  const apiVersionRouter = express.Router();

  apiVersionRouter.use("/auth", authRoutes);
  apiVersionRouter.use("/", refreshRoutes);
  apiVersionRouter.use("/ai", aiRoutes);
  apiVersionRouter.use("/resumes", resumeRoutes);
  apiVersionRouter.use("/admin", adminRoutes);

  // Unversioned routes (preferred for new clients)
  app.use("/api/v1", apiVersionRouter);
  // Legacy /api/ prefix — already in apiVersionRouter, no duplicate mounts needed
  app.use("/api", apiVersionRouter);
  // Templates and health — not in auth-protected router
  app.use("/api/templates", templateRoutes);
  app.use("/api/health", healthRoutes);
  app.use("/health", healthRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const app = createApp();

export default app;
