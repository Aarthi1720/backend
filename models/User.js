import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    verificationOtp: String,
    verificationOtpExpiry: Date,

    idVerification: {
      documentUrl: { type: String },
      status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
      },
      method: {
        type: String,
        enum: ["manual", "ocr", "ai"],
        default: "manual",
      },
    },

    loyaltyCoins: { type: Number, default: 0 },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hotel" }],
    resetOtp: String,
    resetOtpExpiry: Date,
  },
  { timestamps: true }
);

// ✅ Password hashing middleware (works for reset, register, etc.)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // skip if unchanged
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export default mongoose.model("User", userSchema);
