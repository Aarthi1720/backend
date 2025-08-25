import express from "express";
import {
  createBooking,
  getUserBookings,
  getAllBookings,
  cancelBooking,
  resendInvoice,
  getBookingsByHotel,
  getBookingById,
  refundBooking,
  completeBooking,
} from "../controllers/booking.controller.js";
import { verifyAdmin, verifyToken } from "../middleware/auth.js";

const router = express.Router();

// User & Admin Booking Routes
router.post("/", verifyToken, createBooking);
router.get("/", verifyToken, verifyAdmin, getAllBookings);
router.get("/user/:userId", verifyToken, getUserBookings);
router.get("/hotel/:hotelId", verifyToken, getBookingsByHotel);
router.get("/:id", verifyToken, getBookingById);
router.patch("/:id/cancel", verifyToken, cancelBooking);
router.post("/:id/resend-confirmation", verifyToken, resendInvoice);

// Admin-only actions
router.post("/:id/refund", verifyToken, verifyAdmin, refundBooking);
router.post("/:id/complete", verifyToken, verifyAdmin, completeBooking);

export default router;
