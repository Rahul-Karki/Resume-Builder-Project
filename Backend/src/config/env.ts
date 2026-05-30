import "dotenv/config";
import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

const optionalUrlFromEnv = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}, z.string().url().optional());

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  FRONTEND_URLS: z.string().optional().default(""),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_PRIVATE_KEY: z.string().optional().default(""),
  JWT_ACCESS_PUBLIC_KEY: z.string().optional().default(""),
  JWT_ACCESS_PUBLIC_KEY_OLD: z.string().optional().default(""),
  JWT_REFRESH_PRIVATE_KEY: z.string().optional().default(""),
  JWT_REFRESH_PUBLIC_KEY: z.string().optional().default(""),
  JWT_REFRESH_PUBLIC_KEY_OLD: z.string().optional().default(""),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM: z.string().email("RESEND_FROM must be a valid email").optional(),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  SERVICE_NAME: z.string().min(1).default("resume-builder-backend"),
  SERVICE_VERSION: z.string().min(1).default("1.0.0"),
  REQUEST_BODY_LIMIT: z.string().default("1mb"),
  ENABLE_METRICS: booleanFromEnv.default(true),
  METRICS_PATH: z.string().default("/metrics"),
  REDIS_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),
  UPSTASH_CALLS_PER_MIN: z.coerce.number().int().min(10).default(600),
  USE_MEMORY_ONLY_CACHE: booleanFromEnv.default(false),
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(5000),
  REDIS_CACHE_TTL_SECONDS: z.coerce.number().int().min(1).default(300),
  REDIS_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
  REDIS_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  RESUME_DOWNLOAD_JOB_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(2),
  RESUME_DOWNLOAD_JOB_TIMEOUT_MS: z.coerce.number().int().min(5000).default(120000),
  RESUME_DOWNLOAD_STALE_PENDING_MS: z.coerce.number().int().min(60000).default(900000),
  AI_PROVIDER: z.enum(["openai", "gemini", "openrouter", "auto"]).default("auto"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.0-flash"),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  OPENROUTER_MODEL: z.string().min(1).default("openai/gpt-4o-mini"),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(12000),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(30),
  AI_CREDITS_ENFORCED: booleanFromEnv.default(false),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional().default(""),
  GRAFANA_OTLP_ENDPOINT: optionalUrlFromEnv,
  OTEL_INSTANCE_ID: z.string().optional().default(""),
  GRAFANA_API_TOKEN: z.string().optional().default(""),
  GRAFANA_LOKI_URL: optionalUrlFromEnv.default(""),
  LOKI_INSTANCE_ID: z.string().optional().default(""),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrlFromEnv,
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: optionalUrlFromEnv,
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: optionalUrlFromEnv,
  OTEL_METRIC_EXPORT_INTERVAL_MS: z.coerce.number().int().min(1000).default(15000),
  INTEGRITY_CHECK_INTERVAL_MS: z.coerce.number().int().min(60000).default(3600000),
  CREATE_INDEXES_ON_STARTUP: booleanFromEnv.default(true),
});

const envSchema = baseEnvSchema
  .superRefine((value, ctx) => {
    const extraOrigins = value.FRONTEND_URLS
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    for (const origin of extraOrigins) {
      try {
        new URL(origin);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["FRONTEND_URLS"],
          message: `Invalid URL in FRONTEND_URLS: ${origin}`,
        });
      }
    }

    if (!value.RESEND_FROM) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_FROM"],
        message: "RESEND_FROM must be set",
      });
    }

    if (!value.METRICS_PATH.startsWith("/")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["METRICS_PATH"],
        message: "METRICS_PATH must start with '/'",
      });
    }

    if (value.REDIS_URL) {
      try {
        new URL(value.REDIS_URL);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["REDIS_URL"],
          message: "REDIS_URL must be a valid Redis connection URL",
        });
      }
    }

    if (value.UPSTASH_REDIS_REST_URL) {
      try {
        new URL(value.UPSTASH_REDIS_REST_URL);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["UPSTASH_REDIS_REST_URL"],
          message: "UPSTASH_REDIS_REST_URL must be a valid URL",
        });
      }
    }

  })
  .transform((value) => ({
    ...value,
    FRONTEND_URLS: value.FRONTEND_URLS
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    OTEL_INSTANCE_ID: value.OTEL_INSTANCE_ID.trim(),
    GRAFANA_LOKI_URL: value.GRAFANA_LOKI_URL.trim(),
    LOKI_INSTANCE_ID: value.LOKI_INSTANCE_ID.trim(),
    GRAFANA_API_TOKEN: value.GRAFANA_API_TOKEN.trim(),
    REDIS_URL: value.REDIS_URL.trim(),
    OPENAI_API_KEY: value.OPENAI_API_KEY.trim(),
    GEMINI_API_KEY: value.GEMINI_API_KEY.trim(),
    OPENROUTER_API_KEY: value.OPENROUTER_API_KEY.trim(),
    OPENROUTER_MODEL: value.OPENROUTER_MODEL.trim(),
    OPENROUTER_BASE_URL: value.OPENROUTER_BASE_URL.trim(),
    UPSTASH_REDIS_REST_URL: value.UPSTASH_REDIS_REST_URL.trim(),
    UPSTASH_REDIS_REST_TOKEN: value.UPSTASH_REDIS_REST_TOKEN.trim(),
    PUPPETEER_EXECUTABLE_PATH: value.PUPPETEER_EXECUTABLE_PATH.trim(),
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "env";
    console.error(`- ${key}: ${issue.message}`);
  }
  process.exit(1);
}

const decoded = parsed.success ? {
  ...parsed.data,
  JWT_ACCESS_PRIVATE_KEY: process.env.JWT_ACCESS_PRIVATE_KEY_B64
    ? Buffer.from(process.env.JWT_ACCESS_PRIVATE_KEY_B64, "base64").toString("utf8")
    : (parsed.data.JWT_ACCESS_PRIVATE_KEY || ""),
  JWT_ACCESS_PUBLIC_KEY: process.env.JWT_ACCESS_PUBLIC_KEY_B64
    ? Buffer.from(process.env.JWT_ACCESS_PUBLIC_KEY_B64, "base64").toString("utf8")
    : (parsed.data.JWT_ACCESS_PUBLIC_KEY || ""),
  JWT_REFRESH_PRIVATE_KEY: process.env.JWT_REFRESH_PRIVATE_KEY_B64
    ? Buffer.from(process.env.JWT_REFRESH_PRIVATE_KEY_B64, "base64").toString("utf8")
    : (parsed.data.JWT_REFRESH_PRIVATE_KEY || ""),
  JWT_REFRESH_PUBLIC_KEY: process.env.JWT_REFRESH_PUBLIC_KEY_B64
    ? Buffer.from(process.env.JWT_REFRESH_PUBLIC_KEY_B64, "base64").toString("utf8")
    : (parsed.data.JWT_REFRESH_PUBLIC_KEY || ""),
} : ({} as z.output<typeof envSchema>);

export const env = decoded;
