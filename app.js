import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import hotelRoutes from "./routes/hotel.routes.js";
import roomRoutes from "./routes/room.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import offerRoutes from "./routes/offer.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import availabilityRoutes from "./routes/availability.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

import { stripeWebhook } from "./controllers/webhooks.controller.js";

dotenv.config();
const app = express();
app.set("trust proxy", true);

// ✅ CORS config
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL, 
      "http://localhost:5173", 
      "https://hotel-booking-frontend-beige.vercel.app"
    ],
    credentials: true,
  })
);


// ⚠️ Stripe webhook needs to be BEFORE express.json()
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// ✅ JSON + URL-encoded parsers (after raw middleware)
// app.use(express.json());
app.use(express.json({ type: ["application/json", "text/plain"] }));

app.use(express.urlencoded({ extended: true }));

// ✅ API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/payments", paymentRoutes);

// ✅ Serve static files (for uploaded ID verifications)
app.use("/uploads", express.static(path.join(path.resolve(), "uploads")));

// ✅ MongoDB connection (no deprecated options)
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Start server
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
