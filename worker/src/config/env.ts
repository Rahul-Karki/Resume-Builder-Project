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
  ATS_ANALYSIS_QUEUE_PREFIX: z.string().min(1).default("resume-builder-ats"),
  RESUME_DOWNLOAD_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(1),
  RESUME_DOWNLOAD_JOB_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(2),
  RESUME_DOWNLOAD_BACKOFF_DELAY_MS: z.coerce.number().int().min(1000).default(5000),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL").optional().default("http://localhost:5173"),
  ATS_ANALYSIS_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(1),
  ATS_ANALYSIS_JOB_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(2),
  ATS_ANALYSIS_BACKOFF_DELAY_MS: z.coerce.number().int().min(1000).default(3000),
  AI_PROVIDER: z.enum(["openai", "gemini", "auto"]).default("auto"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.0-flash"),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional().default(""),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  SERVICE_NAME: z.string().min(1).default("resume-builder-worker"),
  SERVICE_VERSION: z.string().min(1).default("1.0.0"),
  ENABLE_WORKER_HEARTBEAT: booleanFromEnv.default(true),
  ENABLE_BULLMQ_QUEUE_EVENTS: booleanFromEnv.default(false),
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
  ATS_ANALYSIS_QUEUE_PREFIX: parsed.data.ATS_ANALYSIS_QUEUE_PREFIX.trim(),
  OPENAI_API_KEY: parsed.data.OPENAI_API_KEY.trim(),
  GEMINI_API_KEY: parsed.data.GEMINI_API_KEY.trim(),
  PUPPETEER_EXECUTABLE_PATH: parsed.data.PUPPETEER_EXECUTABLE_PATH.trim(),
};
