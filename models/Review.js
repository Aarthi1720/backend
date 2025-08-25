import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" }, // optional
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: true, trim: true },
    ip: { type: String, default: null }, // captured for anti‑spam analysis
    isApproved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// One review per user per hotel
reviewSchema.index({ userId: 1, hotelId: 1 }, { unique: true });
// Fast listing & moderation
reviewSchema.index({ hotelId: 1, isApproved: 1, createdAt: -1 });

export default mongoose.model("Review", reviewSchema);
