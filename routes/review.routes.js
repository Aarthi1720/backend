import express from "express";
import {
  createOrUpdateReview,
  updateReview,
  deleteReview,
  getMyReviewForHotel,
  getReviewsForHotel,
  getAllReviews,
  toggleReviewApproval,
  getPendingReviews,
  approveAllPendingReviews,
  getReviewEligibility,
  approveReview,
} from "../controllers/review.controller.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public
router.get("/hotel/:hotelId", getReviewsForHotel);

// Authenticated (user)
router.get("/my", verifyToken, getMyReviewForHotel);
router.get("/eligibility/:hotelId", verifyToken, getReviewEligibility);
router.post("/", verifyToken, createOrUpdateReview);
router.patch("/:id", verifyToken, updateReview);
router.delete("/:id", verifyToken, deleteReview);

// Admin
router.get("/", verifyToken, verifyAdmin, getAllReviews);
router.get("/pending", verifyToken, verifyAdmin, getPendingReviews);
router.patch(
  "/approve-all",
  verifyToken,
  verifyAdmin,
  approveAllPendingReviews
);
router.patch("/:id/approve", verifyToken, verifyAdmin, approveReview);
router.patch("/:id/toggle", verifyToken, verifyAdmin, toggleReviewApproval);

export default router;
