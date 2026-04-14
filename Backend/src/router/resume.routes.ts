import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
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
import { validateRequest } from "../middleware/validateRequest";
import {
  createResumeSchema,
  exportPresetSchema,
  updateResumeSchema,
} from "../validation/schemas";

const router = express.Router();

router.use(authMiddleware);

router.get("/", baseGetAllResumes);
router.get("/:id", baseGetResumeById);
router.post("/", validateRequest({ body: createResumeSchema }), baseCreateResume);
router.put("/:id", validateRequest({ body: updateResumeSchema }), baseUpdateResume);
router.delete("/:id", baseDeleteResume);

router.post("/:id/export-pdf", validateRequest({ body: exportPresetSchema }), getExportPreset);

export default router;