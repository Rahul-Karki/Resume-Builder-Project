import express from "express"
import { registerUser , login, forgotPassword, resetPassword, resendResetLink, googleLogin } from "../controllers/authController"

const router = express.Router();

// routes
router.post("/signup",registerUser);
router.post("/login",login);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resend",resendResetLink)


router.post("/google-login", googleLogin);

export default router;
