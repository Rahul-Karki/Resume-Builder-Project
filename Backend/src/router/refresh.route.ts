import express from "express";
import { issueCsrfToken, refreshAccessToken } from "../controllers/refreshController";

const router = express.Router();

router.get("/csrf", issueCsrfToken);
router.post("/refresh", refreshAccessToken);

export default router;