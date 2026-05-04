import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { env } from "../config/env";
import {
  getExportPreset,
  exportSafePdf,
} from "../controllers/resumeEnhancementController";
import {
  createResume as baseCreateResume,
  deleteResume as baseDeleteResume,
  getAllResumes as baseGetAllResumes,
  getResumeById as baseGetResumeById,
  updateResume as baseUpdateResume,
} from "../controllers/resumeController";
import { createRedisCacheMiddleware } from "../middleware/redisCache";
import { createRedisRateLimitMiddleware } from "../middleware/redisRateLimit";
import { validateRequest } from "../middleware/validateRequest";
import {
  createResumeSchema,
  exportPresetSchema,
  objectIdParamSchema,
  safeExportPdfSchema,
  updateResumeSchema,
} from "../validation/schemas";

const router = express.Router();

const resumeReadCacheTtlSeconds = Math.min(env.REDIS_CACHE_TTL_SECONDS, 60);
const resumeUserScope = (req: express.Request) => `resumes-user:${req.user?.id ?? "anonymous"}`;
const resumeMutationLimiter = createRedisRateLimitMiddleware({
  scope: "resume-mutations",
  windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
  max: Math.max(10, Math.floor(env.REDIS_RATE_LIMIT_MAX / 3)),
  keyBuilder: (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`),
  message: "Too many resume changes. Please try again later.",
});
const resumeExportLimiter = createRedisRateLimitMiddleware({
  scope: "resume-pdf-exports",
  windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
  max: Math.max(5, Math.floor(env.REDIS_RATE_LIMIT_MAX / 6)),
  keyBuilder: (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`),
  message: "Too many PDF export requests. Please try again later.",
});

router.use(authMiddleware);

router.get(
  "/",
  createRedisCacheMiddleware({
    scope: resumeUserScope,
    metricsScope: "resumes-user",
    ttlSeconds: resumeReadCacheTtlSeconds,
  }),
  baseGetAllResumes,
);
router.get(
  "/:id",
  validateRequest({ params: objectIdParamSchema }),
  createRedisCacheMiddleware({
    scope: resumeUserScope,
    metricsScope: "resumes-user",
    ttlSeconds: resumeReadCacheTtlSeconds,
  }),
  baseGetResumeById,
);
router.post("/", validateRequest({ body: createResumeSchema }), resumeMutationLimiter, baseCreateResume);
router.put("/:id", validateRequest({ params: objectIdParamSchema, body: updateResumeSchema }), resumeMutationLimiter, baseUpdateResume);
router.delete("/:id", validateRequest({ params: objectIdParamSchema }), baseDeleteResume);

router.post("/:id/export-pdf", validateRequest({ params: objectIdParamSchema, body: exportPresetSchema }), resumeExportLimiter, getExportPreset);
router.post("/:id/export-pdf-safe", validateRequest({ params: objectIdParamSchema, body: safeExportPdfSchema }), resumeExportLimiter, exportSafePdf);

export default router;