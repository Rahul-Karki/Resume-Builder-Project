import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  applyAtsSuggestion,
  analyzeAts,
  compareResumeVersions,
  createRoleTailoredVariant,
  getExportPreset,
  listResumeVersions,
  restoreResumeVersion,
} from "../controllers/resumeEnhancementController";
import {
  createResume as baseCreateResume,
  deleteResume as baseDeleteResume,
  getAllResumes as baseGetAllResumes,
  getResumeById as baseGetResumeById,
  updateResume as baseUpdateResume,
} from "../controllers/resumeController";
import { getShareAnalytics, upsertShareSettings } from "../controllers/shareController";
import { validateRequest } from "../middleware/validateRequest";
import {
  atsAnalyzeSchema,
  atsApplySuggestionSchema,
  compareVersionsSchema,
  createResumeSchema,
  exportPresetSchema,
  roleTailoredVariantSchema,
  shareSettingsSchema,
  updateResumeSchema,
} from "../validation/schemas";

const router = express.Router();

router.use(authMiddleware);

router.get("/", baseGetAllResumes);
router.get("/:id", baseGetResumeById);
router.post("/", validateRequest({ body: createResumeSchema }), baseCreateResume);
router.put("/:id", validateRequest({ body: updateResumeSchema }), baseUpdateResume);
router.delete("/:id", baseDeleteResume);

router.post("/:id/ats-analyze", validateRequest({ body: atsAnalyzeSchema }), analyzeAts);
router.patch("/:id/ats-suggestions/apply", validateRequest({ body: atsApplySuggestionSchema }), applyAtsSuggestion);

router.get("/:id/versions", listResumeVersions);
router.post("/:id/compare", validateRequest({ body: compareVersionsSchema }), compareResumeVersions);
router.post("/:id/restore/:versionNo", restoreResumeVersion);

router.post("/:id/export-pdf", validateRequest({ body: exportPresetSchema }), getExportPreset);
router.post("/:id/variants/role-tailored", validateRequest({ body: roleTailoredVariantSchema }), createRoleTailoredVariant);

router.post("/:id/share", validateRequest({ body: shareSettingsSchema }), upsertShareSettings);
router.get("/:id/share/analytics", getShareAnalytics);

export default router;