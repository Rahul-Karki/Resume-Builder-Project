import express from "express"
import { registerUser , login, forgotPassword, resetPassword, resendResetLink, googleLogin, getCurrentUser, logout } from "../controllers/authController"
import { authMiddleware } from "../middleware/authMiddleware"

const router = express.Router();

// routes
router.post("/signup",registerUser);
router.post("/login",login);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resend",resendResetLink)


router.post("/google-login", googleLogin);
router.post("/logout", logout);
router.get("/me", authMiddleware, getCurrentUser);

export default router;
