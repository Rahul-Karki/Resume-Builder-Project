import express from "express"
import { registerUser , login, forgotPassword, resetPassword, resendResetLink, googleLogin, getCurrentUser, logout } from "../controllers/authController"
import { authMiddleware } from "../middleware/authMiddleware"
import { validateRequest } from "../middleware/validateRequest";
import {
	authEmailSchema,
	authLoginSchema,
	authResetPasswordSchema,
	authSignupSchema,
	emptyObjectSchema,
	googleLoginSchema,
} from "../validation/schemas";

const router = express.Router();

// routes
router.post("/signup", validateRequest({ body: authSignupSchema }), registerUser);
router.post("/login", validateRequest({ body: authLoginSchema }), login);

router.post("/forgot-password", validateRequest({ body: authEmailSchema }), forgotPassword);
router.post("/reset-password", validateRequest({ body: authResetPasswordSchema }), resetPassword);
router.post("/resend", validateRequest({ body: authEmailSchema }), resendResetLink)


router.post("/google-login", validateRequest({ body: googleLoginSchema }), googleLogin);
router.post("/logout", validateRequest({ body: emptyObjectSchema }), logout);
router.get("/me", validateRequest({ query: emptyObjectSchema }), authMiddleware, getCurrentUser);

export default router;
