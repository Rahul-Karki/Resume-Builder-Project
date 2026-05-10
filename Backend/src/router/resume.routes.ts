import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { env } from "../config/env";
import {
  downloadResume,
  downloadResumeResult,
  getResumePreviewData,
  getResumeDownloadJobStatus,
  getResumeQueueMetrics,
} from "../controllers/resumeDownloadController";
import { getExportPreset } from "../controllers/resumeEnhancementController";
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
  downloadResumeSchema,
  jobStatusParamSchema,
  objectIdParamSchema,
  updateResumeSchema,
  atsAnalysisRequestSchema,
  atsAnalysisLookupSchema,
} from "../validation/schemas";
import {
  analyzeAts,
  getAtsAnalysisByJobId,
  getLatestAtsAnalysis,
} from "../controllers/resumeEnhancementController";

const router = express.Router();

// Preview-data endpoint is intentionally mounted before auth middleware so that
// the worker (Puppeteer) can access preview pages using a short-lived previewToken.
router.get("/preview-data/:id", validateRequest({ params: jobStatusParamSchema }), getResumePreviewData);

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

router.post("/download-resume", validateRequest({ body: downloadResumeSchema }), resumeExportLimiter, downloadResume);
router.get("/queue-metrics", getResumeQueueMetrics);
router.get("/job-status/:id", validateRequest({ params: jobStatusParamSchema }), getResumeDownloadJobStatus);
router.get("/download-result/:id", validateRequest({ params: jobStatusParamSchema }), downloadResumeResult);
router.post("/:id/analyze-ats", validateRequest({ params: objectIdParamSchema, body: atsAnalysisRequestSchema }), resumeMutationLimiter, analyzeAts);
router.get("/:id/ats-analysis/latest", validateRequest({ params: objectIdParamSchema }), getLatestAtsAnalysis);
router.get("/:id/ats-analysis/:jobId", validateRequest({ params: atsAnalysisLookupSchema.extend({ id: objectIdParamSchema.shape.id }) }), getAtsAnalysisByJobId);

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

export default router;