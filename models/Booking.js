import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },

    guests: { type: Number, required: true, min: 1 },
    specialRequests: String,

    // Server-trusted total in INR (rupees). Use Math.round(total * 100) when charging.
    totalAmount: { type: Number, required: true, min: 0 },
    finalAmount: { type: Number, required: true, min: 0 },

    reviewInviteSent: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["pending", "booked", "checkedIn", "cancelled", "completed"],
      default: "pending",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
      index: true,
    },

    // Transaction identifiers and receipt links (Stripe)
    transactionId: { type: String, default: null }, // Stripe charge ID or intent ID for audit
    stripePaymentIntentId: { type: String, default: null, index: true },
    refundId: { type: String, default: null },
    paymentReceiptUrl: { type: String, default: null },
    currency: { type: String, default: "inr" },

    notes: { type: String, default: "" },

    // models/Booking.js (add inside schema definition)
    offerCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0, min: 0 },
    loyaltyCoinsUsed: { type: Number, default: 0, min: 0 },
    loyaltyCoinsEarned: { type: Number, default: 0, min: 0 },

    // Snapshot at time of booking
    emergencyContactSnapshot: {
      hotelName: { type: String, default: "" },
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      role: { type: String, default: "" },
      availableHours: { type: String, default: "" },
    },

    emailPendingSent: { type: Boolean, default: false },
    emailConfirmedSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Validation: checkOut must be after checkIn
bookingSchema.pre("validate", function (next) {
  if (this.checkIn && this.checkOut && this.checkOut <= this.checkIn) {
    return next(new Error("checkOut must be after checkIn"));
  }
  next();
});

// Helpful indexes for analytics and lookups
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ hotelId: 1, createdAt: -1 });
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 500, partialFilterExpression: { status: "pending" } }
);

export default mongoose.model("Booking", bookingSchema);
