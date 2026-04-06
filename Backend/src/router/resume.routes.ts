import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createResume,
  deleteResume,
  getAllResumes,
  getResumeById,
  updateResume,
} from "../controllers/resumeController";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getAllResumes);
router.get("/:id", getResumeById);
router.post("/", createResume);
router.put("/:id", updateResume);
router.delete("/:id", deleteResume);

export default router;