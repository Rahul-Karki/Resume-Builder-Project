import { Router } from "express";
import { downloadPublicShareResume, getPublicShareResume } from "../controllers/shareController";
import { validateRequest } from "../middleware/validateRequest";
import { shareDownloadSchema } from "../validation/schemas";

const router = Router();

router.get("/:slug", getPublicShareResume);
router.post("/:slug/download", validateRequest({ body: shareDownloadSchema }), downloadPublicShareResume);

export default router;
