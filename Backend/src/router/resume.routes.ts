import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createResume,
  deleteResume,
  getAllResumes,
  getResumeById,
  updateResume,
} from "../controllers/resumeController";
import { validateRequest } from "../middleware/validateRequest";
import {
  createResumeSchema,
  emptyObjectSchema,
  objectIdParamSchema,
  updateResumeSchema,
} from "../validation/schemas";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getAllResumes);
router.get("/:id", getResumeById);
router.post("/", validateRequest({ body: createResumeSchema }), createResume);
router.put("/:id", validateRequest({ body: updateResumeSchema }), updateResume);
router.delete("/:id", deleteResume);

export default router;