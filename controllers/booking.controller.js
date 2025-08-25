import dotenv from 'dotenv';
import Stripe from 'stripe';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Offer from '../models/Offer.js';
import { sendBookingConfirmationEmail } from '../services/bookingConfirmed.js';
import { refundPayment } from '../utils/stripe.js'
import { sendBookingCancellationEmail } from '../services/bookingCancelled.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const applyLoyaltyCoinChanges = async ({ booking, userId, deductCoins, awardCoins }) => {
  // Deduct (clamped to current balance to avoid negative)
  if (deductCoins > 0) {
    const user = await User.findById(userId).select('loyaltyCoins');
    const current = Number(user?.loyaltyCoins || 0);
    const toDeduct = Math.min(deductCoins, Math.max(current, 0));
    if (toDeduct > 0) {
      await User.findByIdAndUpdate(userId, { $inc: { loyaltyCoins: -toDeduct } });
    }
  }

  // Award
  if (awardCoins > 0) {
    await User.findByIdAndUpdate(userId, { $inc: { loyaltyCoins: awardCoins } });
    booking.loyaltyCoinsEarned = awardCoins; // reflect on this booking
  }
};


export const createBooking = async (req, res) => {
  try {
    const {
      hotelId,
      roomId,
      checkIn,
      checkOut,
      guests,
      specialRequests,
      offerCode,
      loyaltyCoinsToUse,
    } = req.body;

    const userId = req.user.id;
    if (!hotelId || !roomId || !checkIn || !checkOut || !guests) {
      return res
        .status(400)
        .json({ message: "Hotel, room, dates, and guests are required" });
    }

    // --- Parse dates (UTC, half-open [start, end))
    const [ciY, ciM, ciD] = checkIn.split("-").map(Number);
    const [coY, coM, coD] = checkOut.split("-").map(Number);
    const start = new Date(Date.UTC(ciY, ciM - 1, ciD));
    const end = new Date(Date.UTC(coY, coM - 1, coD));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    // Validate hotel + room
    const hotel = await Hotel.findById(hotelId).select(
      "name emergencyContact isActive"
    );
    if (!hotel || !hotel.isActive) {
      return res.status(400).json({ message: "Hotel not found or inactive" });
    }
    const room = await Room.findOne({ _id: roomId, hotelId }).select(
      "price capacity"
    );
    if (!room)
      return res
        .status(400)
        .json({ message: "Invalid room for selected hotel." });

    // Capacity
    const capacity =
      Number(room.capacity?.adults || 0) + Number(room.capacity?.children || 0);
    if (Number(guests) > capacity) {
      return res
        .status(400)
        .json({ message: `Guest count exceeds room capacity (${capacity}).` });
    }

    // Availability (half-open)
    const overlap = await Booking.findOne({
      hotelId,
      roomId,
      status: { $in: ["booked", "checkedIn", "pending", "completed"] },
      checkIn: { $lt: end },
      checkOut: { $gt: start },
    }).lean();
    if (overlap) {
      return res
        .status(400)
        .json({ message: "Room is not available for the selected dates" });
    }

    // Emergency contact snapshot
    const ec = hotel.emergencyContact || {};
    const emergencyContactSnapshot = {
      hotelName: hotel.name || "",
      name: ec.name || "",
      phone: ec.phone || "",
      role: ec.role || "",
      availableHours: ec.availableHours || "",
    };

    // Pricing
    const MS_PER_NIGHT = 1000 * 60 * 60 * 24;
    const nights = Math.max(1, Math.round((end - start) / MS_PER_NIGHT));
    const roomPrice = Number(room.price) || 0;
    const baseAmount = Math.max(0, roomPrice * nights);

    // Offer handling (flat OR percent with cap)
    let normalizedCode = null;
    let discountAmount = 0;
    if (offerCode) {
      const code = String(offerCode).trim().toUpperCase();
      const now = new Date();
      const offer = await Offer.findOne({ hotelId, code });
      if (!offer)
        return res.status(400).json({ message: "Invalid offer code" });

      const starts = new Date(offer.validFrom);
      const ends = new Date(offer.validTo);
      if (!offer.isActive || now < starts || now > ends) {
        return res.status(400).json({ message: "Offer not valid" });
      }
      if (baseAmount < (offer.minBookingAmount || 0)) {
        return res
          .status(400)
          .json({ message: "Minimum booking amount not met for this offer" });
      }
      if (
        offer.maxRedemptions > 0 &&
        offer.redemptionCount >= offer.maxRedemptions
      ) {
        return res.status(400).json({ message: "Offer usage limit reached" });
      }

      const percent = Number(offer.discountPercent) || 0;
      const flat = Number(offer.discountFlat) || 0;
      const cap = Number(offer.maxDiscountAmount) || Infinity;

      if (flat > 0) {
        discountAmount = Math.min(flat, baseAmount);
      } else if (percent > 0) {
        const raw = Math.floor((percent / 100) * baseAmount);
        discountAmount = Math.min(raw, cap);
      } else {
        discountAmount = 0;
      }

      normalizedCode = offer.code;
    }

    // Loyalty coins
    const user = await User.findById(userId).select("loyaltyCoins name email");
    const requestedCoins = Math.max(0, Number(loyaltyCoinsToUse) || 0);
    const coinsUsable = Math.min(requestedCoins, user?.loyaltyCoins || 0);
    const coinsValue = coinsUsable * 1; // ₹1 per coin

    // Final total
    const finalAmount = Math.max(0, baseAmount - discountAmount - coinsValue);
    const isFree = finalAmount === 0;

    // Create booking
    const booking = await Booking.create({
      userId,
      hotelId,
      roomId,
      checkIn: start,
      checkOut: end,
      guests,
      specialRequests,
      totalAmount: baseAmount,
      finalAmount,
      status: isFree ? "booked" : "pending",
      paymentStatus: isFree ? "paid" : "pending",
      emergencyContactSnapshot,
      offerCode: normalizedCode,
      discountAmount,
      loyaltyCoinsUsed: coinsUsable,
      loyaltyCoinsEarned: 0,
      emailConfirmedSent: false,
    });

    // Free bookings: apply coins + send final email
    if (isFree) {
      const coinsEarned = finalAmount >= 1000 ? 10 : 0;
      await applyLoyaltyCoinChanges({
        booking,
        userId,
        deductCoins: coinsUsable,
        awardCoins: coinsEarned,
      });

      await booking.populate("userId hotelId roomId");
      const bookingObj = {
        ...booking.toObject(),
        userId: booking.userId?.toObject?.() || booking.userId,
        hotelId: booking.hotelId?.toObject?.() || booking.hotelId,
        roomId: booking.roomId?.toObject?.() || booking.roomId,
      };

      if (!booking.emailConfirmedSent) {
        await sendBookingConfirmationEmail({
          booking: bookingObj,
          emergencyContact: emergencyContactSnapshot,
          to: booking.userId?.email,
        });
        booking.emailConfirmedSent = true;
        await booking.save();
      }
    }

    // For paid flows: DO NOT send any email here. Webhook will send after payment succeeds.
    return res.status(201).json({
      success: true,
      booking: booking.toObject(),
    });
  } catch (err) {
    console.error("Create booking error:", err);
    res
      .status(500)
      .json({ message: err.message || "Unexpected server error" });
  }
};


export const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate({ path: 'hotelId', select: 'name location' })
      .populate({ path: 'roomId', select: 'roomNumber type price' })
      .populate({ path: 'userId', select: 'name email' })
      .sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (err) {
    console.error('Error fetching all bookings:', err);
    next(err);
  }
};


export const getUserBookings = async (req, res, next) => { 
  try {
    // Only self or admin
    if (!req.user.isAdmin && req.user.id !== req.params.userId) {
      return res.status(403).json({ message: 'Not authorized to view these bookings' });
    }

    const bookings = await Booking.find({ userId: req.params.userId })
      .populate({ path: 'hotelId', select: 'name location' })
      // ✅ include room name + bedType so frontend doesn’t show undefined
      .populate({ path: 'roomId', select: 'name type bedType view price' })
      .sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (err) {
    next(err);
  }
};


export const resendInvoice = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("roomId userId hotelId");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Block only if cancelled or refunded
    if (["cancelled", "refunded"].includes(booking.status)) {
      return res.status(400).json({ message: "Invoice cannot be resent for cancelled/refunded bookings" });
    }

    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({ error: "Invoice can only be resent for paid bookings" });
    }

    // Only owner or admin can trigger resend
    if (!req.user.isAdmin && booking.userId?._id?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to resend this invoice" });
    }

    if (!booking.userId?.email) {
      return res.status(400).json({ error: "No email found for this booking" });
    }

    const ec = booking.hotelId?.emergencyContact || {};
    const emergencyContactSnapshot = booking.emergencyContactSnapshot?.hotelName
      ? booking.emergencyContactSnapshot
      : {
          hotelName: booking.hotelId?.name || "",
          name: ec.name || "",
          phone: ec.phone || "",
          role: ec.role || "",
          availableHours: ec.availableHours || "",
        };

    const now = new Date();
    const currentOffers = await Offer.find({
      hotelId: booking.hotelId._id,
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
    }).select("code discountPercent description validTo");

    await sendBookingConfirmationEmail({
      booking,
      totals: {
        subtotal: booking.totalAmount + (booking.discountAmount || 0),
        discount: booking.discountAmount || 0,
        tax: 0,
        total: booking.totalAmount,
        currency: booking.currency || "inr",
      },
      emergencyContact: emergencyContactSnapshot,
      offers: currentOffers,
      to: booking.userId.email,
    });

    res.json({ success: true, message: "Invoice resent successfully" });
  } catch (err) {
    console.error("Resend invoice failed:", err);
    next(err);
  }
};


export const getBookingsByHotel = async (req, res, next) => {
  try {
    const { hotelId } = req.params;

    // Base query: hotel + allowed statuses
    const query = {
      hotelId,
      status: { $in: ['booked', 'completed'] }
    };

    // If not admin, filter to only this user's bookings
    if (!req.user.isAdmin) {
      query.userId = req.user.id;
    }

    const bookings = await Booking.find(query)
      .populate({ path: 'userId', select: 'name email' })
      .select('_id userId checkIn checkOut status');

    res.status(200).json(bookings);
  } catch (err) {
    next(err);
  }
};


export const getBookingById = async (req, res, next) => { 
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user?.role === 'admin'; // use role

    const booking = await Booking.findById(bookingId)
      .populate({ path: 'hotelId', select: 'name location emergencyContact' })
      .populate({ path: 'roomId', select: 'displayName type bedType view price' })
      .populate({ path: 'userId', select: 'name email' });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Role-safe access
    if (!isAdmin && booking.userId._id.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Fallback EC snapshot if none stored
    const ecSrc = booking.hotelId?.emergencyContact || {};
    const emergencyContactSnapshot =
      booking.emergencyContactSnapshot?.hotelName
        ? booking.emergencyContactSnapshot
        : {
            hotelName: booking.hotelId?.name || '',
            name: ecSrc.name || '',
            phone: ecSrc.phone || '',
            role: ecSrc.role || '',
            availableHours: ecSrc.availableHours || ''
          };

    // Canonical totals
    const discount = booking.discountAmount || 0;
    const tax = 0;
    const total = booking.totalAmount;
    const subtotal = total + discount - tax;

    res.status(200).json({
      _id: booking._id,
      hotel: {
        _id: booking.hotelId?._id,
        name: booking.hotelId?.name || "Hotel",
        location: booking.hotelId?.location || null,
      },
      room: {
        _id: booking.roomId?._id,
        name: booking.roomId?.displayName || "N/A",
        type: booking.roomId?.type,
        bedType: booking.roomId?.bedType,
        view: booking.roomId?.view,
        price: booking.roomId?.price,
      },
      user: {
        _id: booking.userId?._id,
        name: booking.userId?.name || "N/A",
        email: booking.userId?.email || "N/A",
      },
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      specialRequests: booking.specialRequests || '',
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentReceiptUrl: booking.paymentReceiptUrl || null,
      stripePaymentIntentId: booking.stripePaymentIntentId || null,

      // Coins + final amount:
      loyaltyCoinsUsed: booking.loyaltyCoinsUsed || 0,
      loyaltyCoinsEarned: booking.loyaltyCoinsEarned || 0,
      finalAmount: booking.finalAmount,

      offerCode: booking.offerCode || null,
      discountAmount: discount,
      totalAmount: total,
      currency: booking.currency || 'inr',

      emergencyContactSnapshot,

      invoiceTotals: {
        subtotal,
        discount,
        tax,
        total,
        currency: booking.currency || 'inr',
      },
      createdAt: booking.createdAt,
    });
  } catch (err) {
    console.error('Error fetching booking by ID:', err);
    next(err);
  }
};


export const refundBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("userId hotelId roomId");

    if (!booking || booking.paymentStatus !== "paid") {
      return res.status(400).json({ error: "Invalid booking or already refunded" });
    }

    // Check if already refunded
    if (booking.refundId || booking.paymentStatus === "refunded") {
      // ✅ Still update the status if it's missing
      booking.status = "cancelled";
      booking.paymentStatus = "refunded";
      await booking.save();

      return res.status(200).json({ success: true, message: "Already refunded earlier" });
    }

    // 🟡 Create refund on Stripe
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
    });

    // ✅ Update MongoDB
    booking.status = "cancelled";
    booking.paymentStatus = "refunded";
    booking.refundId = refund.id;
    await booking.save();

    // ✅ Credit back coins if used
    if (booking.loyaltyCoinsUsed && booking.userId?._id) {
      await User.findByIdAndUpdate(booking.userId._id, {
        $inc: { loyaltyCoins: booking.loyaltyCoinsUsed },
      });
    }

    // ✅ Send email (optional, guard against null)
    if (booking.userId?.email) {
      const ec = booking.emergencyContactSnapshot?.hotelName
        ? booking.emergencyContactSnapshot
        : {
            hotelName: booking.hotelId?.name || "",
            name: booking.hotelId?.emergencyContact?.name || "",
            phone: booking.hotelId?.emergencyContact?.phone || "",
            role: booking.hotelId?.emergencyContact?.role || "",
            availableHours: booking.hotelId?.emergencyContact?.availableHours || "",
          };

      await sendBookingCancellationEmail({
        booking: booking.toObject(),
        refund,
        emergencyContact: ec,
        to: booking.userId.email,
      });
    }

    res.json({ success: true, refundId: refund.id });
  } catch (err) {
    // Catch and show friendly error
    console.error("Refund error:", err);

    // Detect Stripe "already refunded" error
    if (err.code === "charge_already_refunded") {
      return res.status(400).json({ error: "This booking has already been refunded." });
    }

    res.status(500).json({ error: "Refund failed" });
  }
};


export const completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Invalid booking or already completed' });
    }

    booking.status = 'completed';
    await booking.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Completion error:', err);
    res.status(500).json({ error: 'Marking as completed failed' });
  }
};


export const cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    const booking = await Booking.findById(bookingId)
      .populate("userId hotelId roomId");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Role check: only owner or admin
    if (!isAdmin && booking.userId._id.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Already cancelled?
    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking already cancelled" });
    }

    let refund = null;

    // Refund if already paid
    if (booking.paymentStatus === "paid" && booking.stripePaymentIntentId) {
      try {
        refund = await refundPayment(booking.stripePaymentIntentId);
        booking.paymentStatus = "refunded";
        booking.refundId = refund.id;
      } catch (err) {
        console.error("❌ Refund failed:", err.message);
        return res.status(500).json({ message: "Refund failed. Please contact support." });
      }
    }

    // Cancel booking regardless
    booking.status = "cancelled";
    await booking.save();

    // Send cancellation email
    const bookingObj = {
      ...booking.toObject(),
      userId: booking.userId?.toObject?.() || booking.userId,
      hotelId: booking.hotelId?.toObject?.() || booking.hotelId,
      roomId: booking.roomId?.toObject?.() || booking.roomId,
    };

    await sendBookingCancellationEmail({
      booking: bookingObj,
      to: booking.userId?.email,
      refundId: refund?.id || null,
    });

    res.json({
      success: true,
      message: refund ? "Booking cancelled & refunded" : "Booking cancelled",
      refundId: refund?.id || null,
    });
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ message: "Unexpected server error" });
  }
};


