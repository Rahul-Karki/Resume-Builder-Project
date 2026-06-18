import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { env } from "../config/env";

import {
  createResume as baseCreateResume,
  deleteResume as baseDeleteResume,
  getAllResumes as baseGetAllResumes,
  getResumeById as baseGetResumeById,
  updateResume as baseUpdateResume,
} from "../controllers/resumeController";
import {
  analyzeAts,
  getAtsAnalysisByJobId,
  getLatestAtsAnalysis,
} from "../controllers/resumeEnhancementController";
import {
  cancelResumeDownload,
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
import { creditDeductionMiddleware } from "../middleware/creditDeduction";
import {
  createResumeSchema,
  jobStatusParamSchema,
  objectIdParamSchema,
  previewHtmlSchema,
  resumeListQuerySchema,
  updateResumeSchema,
} from "../validation/schemas";
import { previewHtml } from "../controllers/resumePreviewController";

const router = express.Router();



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

const previewHtmlLimiter = createRedisRateLimitMiddleware({
  scope: "preview-html",
  windowMs: 60000,
  max: 30,
  keyBuilder: (req) => req.ip ? `ip:${req.ip}` : `global`,
  message: "Too many preview requests. Please try again later.",
});

const resumeReadLimiter = createRedisRateLimitMiddleware({
  scope: "resume-reads",
  windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
  max: Math.max(20, Math.floor(env.REDIS_RATE_LIMIT_MAX / 2)),
  keyBuilder: resumeRateLimitKeyBuilder,
  message: "Too many resume read requests. Please try again later.",
});

const resumeDeleteLimiter = createRedisRateLimitMiddleware({
  scope: "resume-deletes",
  windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
  max: Math.max(5, Math.floor(env.REDIS_RATE_LIMIT_MAX / 5)),
  keyBuilder: resumeRateLimitKeyBuilder,
  message: "Too many resume delete requests. Please try again later.",
});

router.post("/preview-html", previewHtmlLimiter, validateRequest({ body: previewHtmlSchema }), previewHtml);

router.use(authMiddleware);



router.get(
  "/",
  resumeReadLimiter,
  validateRequest({ query: resumeListQuerySchema }),
  resumeCacheMiddleware,
  baseGetAllResumes,
);
router.get(
  "/:id",
  resumeReadLimiter,
  validateRequest({ params: objectIdParamSchema }),
  resumeCacheMiddleware,
  baseGetResumeById,
);
const largeBodyParser = express.json({ limit: "10mb" });

router.post(
  "/",
  largeBodyParser,
  validateRequest({ body: createResumeSchema }),
  resumeMutationLimiter,
  createReferentialIntegrityMiddleware("resumes", (req) => ({ userId: req.user?.id })),
  baseCreateResume,
);
router.put(
  "/:id",
  largeBodyParser,
  validateRequest({ params: objectIdParamSchema, body: updateResumeSchema }),
  resumeMutationLimiter,
  createReferentialIntegrityMiddleware("resumes", (req) => ({ userId: req.user?.id }), "update"),
  baseUpdateResume,
);
router.delete("/:id", resumeDeleteLimiter, validateRequest({ params: objectIdParamSchema }), baseDeleteResume);

router.post(
  "/download-resume",
  createReferentialIntegrityMiddleware("resumedownloadjobs", (req) => ({ userId: req.user?.id })),
  resumeExportLimiter,
  downloadResume,
);
router.get("/job-status/:id", resumeReadLimiter, validateRequest({ params: jobStatusParamSchema }), getResumeDownloadJobStatus);
router.get("/job-events/:id", resumeReadLimiter, validateRequest({ params: jobStatusParamSchema }), streamResumeDownloadJobEvents);
router.post("/job-cancel/:id", resumeMutationLimiter, validateRequest({ params: jobStatusParamSchema }), cancelResumeDownload);
router.get("/download-result/:id", resumeReadLimiter, validateRequest({ params: jobStatusParamSchema }), downloadResumeResult);
router.get("/preview-data/:id", resumeReadLimiter, validateRequest({ params: jobStatusParamSchema }), getResumePreviewData);



router.post(
  "/:id/analyze-ats",
  resumeMutationLimiter,
  validateRequest({ params: objectIdParamSchema }),
  creditDeductionMiddleware({ operation: "ats-analysis" }),
  createReferentialIntegrityMiddleware("atsanalyses", (req) => ({ resumeId: req.params.id })),
  analyzeAts,
);
router.get("/:id/ats-analysis/latest", resumeReadLimiter, validateRequest({ params: objectIdParamSchema }), getLatestAtsAnalysis);
router.get("/:id/ats-analysis/:jobId", resumeReadLimiter, validateRequest({ params: objectIdParamSchema }), getAtsAnalysisByJobId);




export default router;