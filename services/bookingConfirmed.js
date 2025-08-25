
import { bookingConfirmedHtml } from './emailTemplates/bookingConfirmedHtml.js';
import { transporter } from '../utils/email.js';
import Offer from '../models/Offer.js'; // ⬅️ import your Offer model

export const sendBookingConfirmationEmail = async ({
  booking,
  emergencyContact,
  to,
}) => {
  // Load a few active offers for THIS hotel, to showcase in the email
  let offers = [];
  try {
    const hotelId = booking?.hotelId?._id || booking?.hotelId;
    if (hotelId) {
      const now = new Date();
      offers = await Offer.find({
        hotelId,
        isActive: true,
        validFrom: { $lte: now },
        validTo: { $gte: now },
      })
        .sort({ validTo: 1 }) // soonest-expiring first
        .limit(3)
        .lean();
    }
  } catch (e) {
    console.warn('Email: failed to load offers:', e.message);
  }

  const html = bookingConfirmedHtml(booking, emergencyContact, offers);

  await transporter.sendMail({
    from: `"CasaStay" <${process.env.EMAIL_USER}>`,
    to: to || booking.userEmail || booking.userId?.email,
    subject: `Booking Confirmation — ${emergencyContact?.hotelName || 'Your Stay'}`,
    html,
  });
};
