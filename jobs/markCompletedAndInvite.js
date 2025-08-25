import Booking from "../models/Booking.js";
import { sendReviewInviteEmail } from "../services/reviewInviteEmail.js";

export const runMarkCompletedAndInvite = async () => {
  const now = new Date();

  // 1) Mark booked stays as completed if checkout is in the past
  await Booking.updateMany(
    { status: 'booked', checkOut: { $lt: now } },
    { $set: { status: 'completed' } }
  );

  // 2) Send review invites for recently completed (not invited yet)
  const since = new Date(now.getTime() - 1000 * 60 * 60 * 48); // last 48h
  const toInvite = await Booking.find({
    status: 'completed',
    paymentStatus: 'paid',
    reviewInviteSent: { $ne: true },
    checkOut: { $lt: now, $gt: since },
  })
    .populate('userId', 'email name')
    .populate('hotelId', 'name');

  for (const b of toInvite) {
    try {
      await sendReviewInviteEmail({ booking: b });
      b.reviewInviteSent = true;
      await b.save();
    } catch (e) {
      console.warn('Review invite failed for booking', b._id, e.message);
    }
  }
};
