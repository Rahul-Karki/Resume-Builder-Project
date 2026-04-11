import { Router } from "express";
import { listPublicTemplates } from "../controllers/templateController";

const router = Router();

router.get("/", listPublicTemplates);

export default router;
