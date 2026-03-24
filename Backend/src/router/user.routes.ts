import express from "express"
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authMiddleware);

router.get("/resumes");
router.get("/templates")
router.get("/jobsApplies")