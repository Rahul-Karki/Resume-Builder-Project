import express from "express";
import { refreshAccessToken } from "../controllers/refreshController";
import { validateRequest } from "../middleware/validateRequest";
import { emptyObjectSchema } from "../validation/schemas";

const router = express.Router();

router.post("/refresh", validateRequest({ body: emptyObjectSchema }), refreshAccessToken);

export default router;