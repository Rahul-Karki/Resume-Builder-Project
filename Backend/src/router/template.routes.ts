import { Router } from "express";
import { listPublicTemplates } from "../controllers/templateController";
import { validateRequest } from "../middleware/validateRequest";
import { publicTemplateListQuerySchema } from "../validation/schemas";

const router = Router();

router.get("/", listPublicTemplates);

export default router;
