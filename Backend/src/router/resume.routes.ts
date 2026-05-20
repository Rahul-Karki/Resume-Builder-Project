import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { env } from "../config/env";
// Removed BullMQ-related imports to reduce Redis usage
import {
  createResume as baseCreateResume,
  deleteResume as baseDeleteResume,
  getAllResumes as baseGetAllResumes,
  getResumeById as baseGetResumeById,
  updateResume as baseUpdateResume,
} from "../controllers/resumeController";
import {
  analyzeAts,
  applyAtsSuggestion,
  getAtsAnalysisByJobId,
  getLatestAtsAnalysis,
} from "../controllers/resumeEnhancementController";
import {
  downloadResume,
  downloadResumeResult,
  getResumeDownloadJobStatus,
  getResumePreviewData,
  streamResumeDownloadJobEvents,
} from "../controllers/resumeDownloadController";
import { createRedisCacheMiddleware } from "../middleware/redisCache";
import { createRedisRateLimitMiddleware } from "../middleware/redisRateLimit";
import { validateRequest } from "../middleware/validateRequest";
import { createReferentialIntegrityMiddleware } from "../middleware/referentialIntegrity";
// creditDeductionMiddleware removed - was used for ATS analysis which was removed
import {
  createResumeSchema,
  jobStatusParamSchema,
  objectIdParamSchema,
  updateResumeSchema,
} from "../validation/schemas";

const router = express.Router();

// Preview-data endpoint removed - was related to BullMQ worker access

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
// resumeExportLimiter removed - no longer needed after removing BullMQ endpoints

router.use(authMiddleware);

// BullMQ endpoints removed to reduce Redis usage

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
router.post(
  "/",
  validateRequest({ body: createResumeSchema }),
  resumeMutationLimiter,
  createReferentialIntegrityMiddleware("resumes", (req) => ({ userId: req.user?.id })),
  baseCreateResume,
);
router.put(
  "/:id",
  validateRequest({ params: objectIdParamSchema, body: updateResumeSchema }),
  resumeMutationLimiter,
  createReferentialIntegrityMiddleware("resumes", (req) => ({ userId: req.user?.id }), "update"),
  baseUpdateResume,
);
router.delete("/:id", validateRequest({ params: objectIdParamSchema }), baseDeleteResume);

router.post(
  "/download-resume",
  createReferentialIntegrityMiddleware("resumedownloadjobs", (req) => ({ userId: req.user?.id })),
  downloadResume,
);
router.get("/job-status/:id", validateRequest({ params: jobStatusParamSchema }), getResumeDownloadJobStatus);
router.get("/job-events/:id", validateRequest({ params: jobStatusParamSchema }), streamResumeDownloadJobEvents);
router.get("/download-result/:id", validateRequest({ params: jobStatusParamSchema }), downloadResumeResult);
router.get("/preview-data/:id", validateRequest({ params: jobStatusParamSchema }), getResumePreviewData);

// export-pdf endpoint removed - was related to BullMQ PDF generation

router.post(
  "/:id/analyze-ats",
  validateRequest({ params: objectIdParamSchema }),
  createReferentialIntegrityMiddleware("atsanalyses", (req) => ({ resumeId: req.params.id })),
  analyzeAts,
);
router.post(
  "/:id/ats-analysis",
  validateRequest({ params: objectIdParamSchema }),
  createReferentialIntegrityMiddleware("atsanalyses", (req) => ({ resumeId: req.params.id })),
  analyzeAts,
);
router.get("/:id/ats-analysis/latest", validateRequest({ params: objectIdParamSchema }), getLatestAtsAnalysis);
router.get("/:id/ats-analysis/:jobId", validateRequest({ params: objectIdParamSchema }), getAtsAnalysisByJobId);
router.post("/:id/apply-suggestion", validateRequest({ params: objectIdParamSchema }), applyAtsSuggestion);

// Resume version endpoints removed - were related to BullMQ functionality

export default router;