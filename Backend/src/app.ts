import crypto from "crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env";
import apiVersionMiddleware from "./middleware/apiVersion";
import { csrfProtection } from "./middleware/csrfProtection";
import { createRedisRateLimitMiddleware } from "./middleware/redisRateLimit";
import { correlationIdMiddleware } from "./middleware/correlationId";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestTimeoutMiddleware } from "./middleware/requestTimeout";
import { requestSizeLimitMiddleware } from "./middleware/requestSizeLimit";
import { clientErrorHandler, logger, metricsHandler, metricsMiddleware, requestLogger } from "./observability";
import { openAPISpec } from "./config/openapi";
import { auditContextMiddleware, referentialIntegrityMiddleware } from "./middleware/referentialIntegrity";

import authRoutes from "./router/auth.routes";
import refreshRoutes from "./router/refresh.route";
import resumeRoutes from "./router/resume.routes";
import aiRoutes from "./router/ai.routes";
import adminRoutes from "./router/admin.routes";
import templateRoutes from "./router/template.routes";
import healthRoutes from "./router/health.routes";
import frontendLogsRoutes from "./router/frontendLogs.routes";
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

  const isOriginAllowed = (origin: string): boolean => {
    const normalizedOrigin = origin.trim().replace(/\/$/, "");

    if (configuredOrigins.includes(normalizedOrigin)) return true;

    // Allow localhost in development (no ALLOW_PREVIEW_ORIGINS flag needed for dev)
    if (
      normalizedOrigin.startsWith("http://localhost:") ||
      normalizedOrigin.startsWith("https://localhost:")
    ) return true;

    // Allow Render and Vercel preview deployments by default
    if (
      normalizedOrigin.endsWith(".onrender.com") ||
      normalizedOrigin.endsWith(".vercel.app")
    ) return true;

    const MAX_PATTERN_LENGTH = 100;
    for (const pattern of env.CORS_EXTRA_PATTERNS) {
      if (pattern.length > MAX_PATTERN_LENGTH) continue;
      // ReDoS protection: reject patterns with nested quantifiers or deep backtracking risk
      if (/(\.[*+?][{*+?]|\(.*\)[*+?]|\[.*\]\++|\(.*\)\++)/.test(pattern)) continue;
      try {
        const regex = new RegExp(pattern);
        if (regex.test(normalizedOrigin)) return true;
      } catch {
        // Invalid regex in env config — skip silently
      }
    }

    return false;
  };

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) {
        // Allow server-to-server requests (e.g., health checks, cron)
        callback(null, true);
        return;
      }

      if (isOriginAllowed(origin)) {
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

  // 1. HTTPS redirect in production (before CORS to avoid mixed-content issues)
  if (env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      if (req.headers["x-forwarded-proto"] !== "https" && req.headers["x-forwarded-proto"] !== "https, http/1.1") {
        return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
      }
      next();
    });
  }

  // 2. CORS MUST come early to handle preflight and error responses
  app.use(cors(corsOptions));

  // 2. Compression middleware to reduce response payload size
  app.use(compression({
    level: 3, // balance between compression ratio and CPU usage
    threshold: 1024, // only compress responses larger than 1KB
  }));

  // 3. Helmet for security headers (CSP handled by custom middleware below)
  app.use(helmet({
    contentSecurityPolicy: false,
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }));
  // Per-request CSP with nonces for inline scripts
  app.use((_req, res, next) => {
    const nonce = crypto.randomBytes(16).toString("base64");
    res.locals.cspNonce = nonce;
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        `script-src 'self' https://accounts.google.com 'nonce-${nonce}'`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://*.googleusercontent.com",
        "font-src 'self' data:",
        "connect-src 'self' https://accounts.google.com",
        "frame-src 'self' https://accounts.google.com",
        "object-src 'none'",
        "upgrade-insecure-requests",
      ].join("; ")
    );
    next();
  });

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

  let cachedDocs: string | null = null;
  app.get("/api/docs", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (!cachedDocs) {
      cachedDocs = JSON.stringify(openAPISpec);
    }
    res.send(cachedDocs);
  });

  // API routes — single mount point under /api
  // Legacy /api/v1 prefix is supported via a simple rewrite middleware
  const apiRouter = express.Router();

  apiRouter.use("/auth", authRoutes);
  apiRouter.use("/", refreshRoutes);
  apiRouter.use("/ai", aiRoutes);
  apiRouter.use("/resumes", resumeRoutes);
  apiRouter.use("/admin", adminRoutes);

  // Primary mount
  app.use("/api", apiRouter);
  // Legacy /api/v1 support: strip the /v1 prefix so middleware fires only once
  app.use("/api/v1", (req, _res, next) => {
    req.url = req.url.replace(/^\/v1/, "");
    next();
  }, apiRouter);
  // Templates and health — not in auth-protected router
  app.use("/api/templates", templateRoutes);
  app.use("/api/logs/ingest", frontendLogsRoutes);
  app.use("/api/health", healthRoutes);
  app.use("/health", healthRoutes);

  const clientErrorLimiter = createRedisRateLimitMiddleware({
    scope: "client-error",
    windowMs: 60_000,
    max: 20,
    keyBuilder: (req) => `ip:${req.ip}`,
    message: "Too many error reports.",
  });
  app.post("/api/client-error", clientErrorLimiter, clientErrorHandler);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const app = createApp();

export default app;
