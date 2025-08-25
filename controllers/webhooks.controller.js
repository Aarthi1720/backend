import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { sendBookingConfirmationEmail } from "../services/bookingConfirmed.js";
import stripe from "../utils/stripe.js";
import Offer from "../models/Offer.js";

const applyLoyaltyCoinChanges = async ({
  booking,
  userId,
  deductCoins,
  awardCoins,
}) => {
  // Deduct (clamped to current balance to avoid negative)
  if (deductCoins > 0) {
    const user = await User.findById(userId).select("loyaltyCoins");
    const current = Number(user?.loyaltyCoins || 0);
    const toDeduct = Math.min(deductCoins, Math.max(current, 0));
    if (toDeduct > 0) {
      await User.findByIdAndUpdate(userId, {
        $inc: { loyaltyCoins: -toDeduct },
      });
    }
  }

  // Award
  if (awardCoins > 0) {
    await User.findByIdAndUpdate(userId, {
      $inc: { loyaltyCoins: awardCoins },
    });
    booking.loyaltyCoinsEarned = awardCoins; // reflect on this booking
  }
};

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw body
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log("⚠️ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const bookingId = intent.metadata?.bookingId;

        let booking = bookingId
          ? await Booking.findById(bookingId).populate("userId hotelId roomId")
          : await Booking.findOne({
              stripePaymentIntentId: intent.id,
            }).populate("userId hotelId roomId");

        if (!booking) return res.json({ received: true });
        if (booking.paymentStatus === "paid")
          return res.json({ received: true });

        // Update statuses
        booking.paymentStatus = "paid";
        booking.status = "booked";
        booking.stripePaymentIntentId = intent.id;
        booking.transactionId = intent.id;

        const charge = intent.charges?.data?.[0];
        if (charge?.receipt_url) booking.paymentReceiptUrl = charge.receipt_url;

        // Coins: deduct used + award if finalAmount >= 1000
        await applyLoyaltyCoinChanges({
          booking,
          userId: booking.userId._id,
          deductCoins: booking.loyaltyCoinsUsed,
          awardCoins: (booking.finalAmount || 0) >= 1000 ? 10 : 0,
        });

        // Offer redemption counter
        if (booking.offerCode) {
          await Offer.updateOne(
            { hotelId: booking.hotelId._id, code: booking.offerCode },
            { $inc: { redemptionCount: 1 } }
          );
        }

        await booking.save();

        // Final confirmation email (idempotent)
        if (!booking.emailConfirmedSent) {
          const bookingObj = {
            ...booking.toObject(),
            userId: booking.userId?.toObject?.() || booking.userId,
            hotelId: booking.hotelId?.toObject?.() || booking.hotelId,
            roomId: booking.roomId?.toObject?.() || booking.roomId,
          };

          await sendBookingConfirmationEmail({
            booking: bookingObj,
            emergencyContact: booking.emergencyContactSnapshot,
            to: booking.userId?.email,
          });

          booking.emailConfirmedSent = true;
          await booking.save();
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object;
        const bookingId = intent.metadata?.bookingId;
        const booking = bookingId
          ? await Booking.findById(bookingId)
          : await Booking.findOne({ stripePaymentIntentId: intent.id });

        if (booking && booking.status === "pending") {
          booking.status = "cancelled";
          booking.paymentStatus = "failed";
          await booking.save();
        }
        break;
      }

      case "payment_intent.canceled": {
        const intent = event.data.object;
        const bookingId = intent.metadata?.bookingId;
        const booking = bookingId
          ? await Booking.findById(bookingId)
          : await Booking.findOne({ stripePaymentIntentId: intent.id });

        if (booking && booking.status === "pending") {
          booking.status = "cancelled";
          booking.paymentStatus = "cancelled";
          await booking.save();
        }
        break;
      }

      default:
        // ignore others
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    res.status(500).send("Server error");
  }
};
