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

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  BULLMQ_REDIS_URL: z.string().optional().default(""),
  REDIS_URL: z.string().optional().default(""),
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(5000),
  RESUME_DOWNLOAD_QUEUE_PREFIX: z.string().min(1).default("resume-builder"),
  RESUME_DOWNLOAD_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(2),
  RESUME_DOWNLOAD_JOB_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  RESUME_DOWNLOAD_BACKOFF_DELAY_MS: z.coerce.number().int().min(1000).default(5000),
  ATS_ANALYSIS_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(2),
  ATS_ANALYSIS_JOB_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  ATS_ANALYSIS_BACKOFF_DELAY_MS: z.coerce.number().int().min(1000).default(3000),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional().default(""),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  SERVICE_NAME: z.string().min(1).default("resume-builder-worker"),
  SERVICE_VERSION: z.string().min(1).default("1.0.0"),
  ENABLE_WORKER_HEARTBEAT: booleanFromEnv.default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid worker environment configuration:");
  for (const issue of parsed.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "env";
    console.error(`- ${key}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = {
  ...parsed.data,
  BULLMQ_REDIS_URL: parsed.data.BULLMQ_REDIS_URL.trim(),
  REDIS_URL: parsed.data.REDIS_URL.trim(),
  PUPPETEER_EXECUTABLE_PATH: parsed.data.PUPPETEER_EXECUTABLE_PATH.trim(),
};
