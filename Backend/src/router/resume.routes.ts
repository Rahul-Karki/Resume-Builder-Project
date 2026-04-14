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

router.get("/", validateRequest({ query: emptyObjectSchema }), getAllResumes);
router.get("/:id", validateRequest({ params: objectIdParamSchema, query: emptyObjectSchema }), getResumeById);
router.post("/", validateRequest({ body: createResumeSchema }), createResume);
router.put("/:id", validateRequest({ params: objectIdParamSchema, body: updateResumeSchema }), updateResume);
router.delete("/:id", validateRequest({ params: objectIdParamSchema, query: emptyObjectSchema }), deleteResume);

export default router;