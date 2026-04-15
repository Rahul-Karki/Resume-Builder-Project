import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { env } from "../config/env";
import {
  getExportPreset,
} from "../controllers/resumeEnhancementController";
import {
  createResume as baseCreateResume,
  deleteResume as baseDeleteResume,
  getAllResumes as baseGetAllResumes,
  getResumeById as baseGetResumeById,
  updateResume as baseUpdateResume,
} from "../controllers/resumeController";
import { createRedisCacheMiddleware } from "../middleware/redisCache";
import { validateRequest } from "../middleware/validateRequest";
import {
  createResumeSchema,
  exportPresetSchema,
  updateResumeSchema,
} from "../validation/schemas";

const router = express.Router();

const resumeReadCacheTtlSeconds = Math.min(env.REDIS_CACHE_TTL_SECONDS, 60);
const resumeUserScope = (req: express.Request) => `resumes-user:${req.user?.id ?? "anonymous"}`;

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
  createRedisCacheMiddleware({
    scope: resumeUserScope,
    metricsScope: "resumes-user",
    ttlSeconds: resumeReadCacheTtlSeconds,
  }),
  baseGetResumeById,
);
router.post("/", validateRequest({ body: createResumeSchema }), baseCreateResume);
router.put("/:id", validateRequest({ body: updateResumeSchema }), baseUpdateResume);
router.delete("/:id", baseDeleteResume);

router.post("/:id/export-pdf", validateRequest({ body: exportPresetSchema }), getExportPreset);

export default router;