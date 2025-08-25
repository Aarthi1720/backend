// mailer/emailTemplates/reviewInviteHtml.js
export const reviewInviteHtml = (booking) => {
  const hotelName = booking.hotelId?.name || 'your hotel';
  const checkOutStr = new Date(booking.checkOut).toLocaleDateString();
  const url = `${process.env.CLIENT_URL}/hotels/${booking.hotelId?._id || booking.hotelId}#reviews`;
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>How was your stay at ${hotelName}?</h2>
      <p>We hope you enjoyed your stay. You checked out on ${checkOutStr}.</p>
      <p>Please share a quick review — it helps other travelers!</p>
      <p><a href="${url}" style="display:inline-block;background:#2563EB;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Write a Review</a></p>
    </div>
  `;
};
