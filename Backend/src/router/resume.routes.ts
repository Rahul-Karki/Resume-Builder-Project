import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { env } from "../config/env";
import {
  downloadResume,
  downloadResumeResult,
  getResumePreviewData,
  getResumeDownloadJobStatus,
  streamResumeDownloadJobEvents,
  getResumeQueueMetrics,
} from "../controllers/resumeDownloadController";
import {
  getExportPreset,
  analyzeAts,
  applyAtsSuggestion,
  listResumeVersions,
  compareResumeVersions,
  restoreResumeVersion,
  createRoleTailoredVariant,
  getAtsAnalysisByJobId,
  getLatestAtsAnalysis,
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
import { creditDeductionMiddleware } from "../middleware/creditDeduction";
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

const router = express.Router();

// Preview-data endpoint is intentionally mounted before auth middleware so that
// the worker (Puppeteer) can access preview pages using a short-lived previewToken.
router.get("/preview-data/:id", validateRequest({ params: jobStatusParamSchema }), getResumePreviewData);

const resumeReadCacheTtlSeconds = Math.min(env.REDIS_CACHE_TTL_SECONDS, 60);
const resumeUserScope = (req: express.Request) => `resumes-user:${req.user?.id ?? "anonymous"}`;
const resumeRateLimitKeyBuilder = (req: express.Request) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`);
const resumeCacheMiddleware = createRedisCacheMiddleware({
  scope: resumeUserScope,
  metricsScope: "resumes-user",
  ttlSeconds: resumeReadCacheTtlSeconds,
});
const resumeMutationLimiter = createRedisRateLimitMiddleware({
  scope: "resume-mutations",
  windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
  max: Math.max(10, Math.floor(env.REDIS_RATE_LIMIT_MAX / 3)),
  keyBuilder: resumeRateLimitKeyBuilder,
  message: "Too many resume changes. Please try again later.",
});
const resumeExportLimiter = createRedisRateLimitMiddleware({
  scope: "resume-pdf-exports",
  windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
  max: Math.max(5, Math.floor(env.REDIS_RATE_LIMIT_MAX / 6)),
  keyBuilder: resumeRateLimitKeyBuilder,
  message: "Too many PDF export requests. Please try again later.",
});

router.use(authMiddleware);

router.post("/download-resume", validateRequest({ body: downloadResumeSchema }), resumeExportLimiter, downloadResume);
router.get("/queue-metrics", getResumeQueueMetrics);
router.get("/job-status/:id", validateRequest({ params: jobStatusParamSchema }), getResumeDownloadJobStatus);
router.get("/job-events/:id", validateRequest({ params: jobStatusParamSchema }), streamResumeDownloadJobEvents);
router.get("/download-result/:id", validateRequest({ params: jobStatusParamSchema }), downloadResumeResult);
router.post(
  "/:id/analyze-ats",
  validateRequest({ params: objectIdParamSchema, body: atsAnalysisRequestSchema }),
  resumeMutationLimiter,
  creditDeductionMiddleware({ operation: "ats-analysis" }),
  analyzeAts,
);
router.get("/:id/ats-analysis/latest", validateRequest({ params: objectIdParamSchema }), getLatestAtsAnalysis);
router.get("/:id/ats-analysis/:jobId", validateRequest({ params: atsAnalysisLookupSchema.extend({ id: objectIdParamSchema.shape.id }) }), getAtsAnalysisByJobId);

router.get(
  "/",
  resumeCacheMiddleware,
  baseGetAllResumes,
);
router.get(
  "/:id",
  validateRequest({ params: objectIdParamSchema }),
  resumeCacheMiddleware,
  baseGetResumeById,
);
router.post("/", validateRequest({ body: createResumeSchema }), resumeMutationLimiter, baseCreateResume);
router.put("/:id", validateRequest({ params: objectIdParamSchema, body: updateResumeSchema }), resumeMutationLimiter, baseUpdateResume);
router.delete("/:id", validateRequest({ params: objectIdParamSchema }), baseDeleteResume);

router.post("/:id/export-pdf", validateRequest({ params: objectIdParamSchema, body: exportPresetSchema }), resumeExportLimiter, getExportPreset);

router.post("/:id/ats-analysis", analyzeAts);
router.post("/:id/apply-suggestion", applyAtsSuggestion);
router.get("/:id/versions", listResumeVersions);
router.post("/:id/compare-versions", compareResumeVersions);
router.post("/:id/restore-version/:versionNo", restoreResumeVersion);
router.post("/:id/variant", createRoleTailoredVariant);

export default router;