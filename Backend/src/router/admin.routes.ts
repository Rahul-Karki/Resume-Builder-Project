import express from "express";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware";
import {
  createTemplate,
  deleteTemplate,
  getTemplateAnalytics,
  getTemplateStats,
  listTemplates,
  updateTemplate,
  updateTemplateStatus,
} from "../controllers/templateController";

const router = express.Router();

router.use(adminAuthMiddleware);

router.get("/templates", listTemplates);
router.post("/templates", createTemplate);
router.put("/templates/:id", updateTemplate);
router.patch("/templates/:id/status", updateTemplateStatus);
router.delete("/templates/:id", deleteTemplate);

router.get("/templates/stats", getTemplateStats);
router.get("/templates/analytics", getTemplateAnalytics);

export default router;
