import express from "express";
import {
  getPendingIdVerifications,
  updateIdVerificationStatus,
  updateKycStatus,
} from "../controllers/admin.controller.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// Protect all routes
router.use(verifyToken, verifyAdmin);

// ✅ Fetch paginated & filtered ID verifications
router.get("/id-verifications", getPendingIdVerifications);

// ✅ Approve/Reject user by status
router.post("/id-verifications/:userId/:status", updateIdVerificationStatus);

// ✅ Optional manual override for KYC
router.patch("/kyc/:userId", updateKycStatus);

export default router;
