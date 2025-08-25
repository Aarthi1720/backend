import { transporter } from "../utils/email.js";
import { bookingCancelledHtml } from "./emailTemplates/bookingCancelledHtml.js";

/**
 * Sends cancellation email to guest after booking is cancelled.
 * If refund is processed, include refund details.
 */
export const sendBookingCancellationEmail = async ({
  booking,
  emergencyContact,
  refund = null,
  to,
}) => {
  const html = bookingCancelledHtml(booking, emergencyContact, refund);

  await transporter.sendMail({
    from: `"CasaStay" <${process.env.EMAIL_USER}>`,
    to: to || booking.userEmail || booking.userId?.email,
    subject: refund
      ? `Booking Cancelled & Refunded — ${
          emergencyContact?.hotelName || "Your Stay"
        }`
      : `Booking Cancelled — ${emergencyContact?.hotelName || "Your Stay"}`,
    html,
  });
};
