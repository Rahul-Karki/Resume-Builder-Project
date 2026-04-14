import "dotenv/config";
import { z } from "zod";

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  FRONTEND_URLS: z.string().optional().default(""),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM: z.string().email("RESEND_FROM must be a valid email").optional(),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email").optional(),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
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

    if (!value.RESEND_FROM && !value.EMAIL_FROM) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_FROM"],
        message: "Either RESEND_FROM or EMAIL_FROM must be set",
      });
    }
  })
  .transform((value) => ({
    ...value,
    FRONTEND_URLS: value.FRONTEND_URLS
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    RESEND_FROM: value.RESEND_FROM ?? value.EMAIL_FROM!,
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

export const env = parsed.data;
