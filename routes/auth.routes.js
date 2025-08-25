import express from "express";
import {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPasswordWithOtp,
  verifyOtpAndActivateUser,
  resendVerificationOtp,
  verifyResetOtp,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/verify-registration", verifyOtpAndActivateUser);
router.post("/resend-otp", resendVerificationOtp);
router.post("/login", loginUser);
router.post("/verify-reset-otp", verifyResetOtp);

// 🔐 New routes
router.post("/forgot-password", requestPasswordReset); // sends OTP
router.post("/reset-password", resetPasswordWithOtp); // verifies OTP + sets password

export default router;
