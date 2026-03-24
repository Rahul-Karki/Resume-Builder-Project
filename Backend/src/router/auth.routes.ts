import express from "express"
import { registerUser , login } from "../controllers/authController"

const router = express.Router();

// routes
router.post("/signup",registerUser);
router.post("/login",login);

export default router;
