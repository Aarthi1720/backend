// controllers/payment.controller.js
import dotenv from "dotenv";
import Stripe from "stripe";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Offer from "../models/Offer.js";
import { sendBookingConfirmationEmail } from "../services/bookingConfirmed.js";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentIntent = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId)
      return res.status(400).json({ error: "Booking ID is required" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const expectedAmountPaise = Math.round(
      (Number(booking.finalAmount) || 0) * 100
    );
    if (!Number.isFinite(expectedAmountPaise) || expectedAmountPaise <= 0) {
      return res
        .status(400)
        .json({ error: "No payment required for this booking" });
    }

    // Reuse only if amount matches & status is confirmable
    if (booking.stripePaymentIntentId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(
          booking.stripePaymentIntentId
        );
        const ok = [
          "requires_payment_method",
          "requires_confirmation",
          "requires_action",
          "processing",
        ];
        if (
          existing.amount === expectedAmountPaise &&
          ok.includes(existing.status)
        ) {
          return res.json({
            clientSecret: existing.client_secret,
            amount: existing.amount,
          });
        }
        // cancel and re-create
        if (!["succeeded", "canceled"].includes(existing.status)) {
          await stripe.paymentIntents.cancel(existing.id, {
            cancellation_reason: "abandoned",
          });
        }
      } catch (e) {
        console.warn("Intent reuse failed:", e.message);
      }
    }

    const intent = await stripe.paymentIntents.create({
      amount: expectedAmountPaise,
      currency: "inr",
      automatic_payment_methods: { enabled: true },
      metadata: { bookingId: booking._id.toString() },
    });

    booking.stripePaymentIntentId = intent.id;
    await booking.save();

    res.json({ clientSecret: intent.client_secret, amount: intent.amount });
  } catch (error) {
    console.error("Error creating PaymentIntent:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
