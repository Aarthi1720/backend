// emailTemplates/bookingConfirmedHtml.js
export const bookingConfirmedHtml = (booking, emergencyContact = {}, offers = []) => {
  const hotelName = emergencyContact.hotelName || booking.hotelId?.name || 'Your Stay';
  const checkInStr = new Date(booking.checkIn).toLocaleDateString();
  const checkOutStr = new Date(booking.checkOut).toLocaleDateString();

  const totalPaid =
    typeof booking.finalAmount === "number"
      ? booking.finalAmount
      : Math.max(
          (booking.totalAmount || 0) -
            (booking.discountAmount || 0) -
            (booking.loyaltyCoinsUsed || 0),
          0
        );

  let html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; color: #333; border: 1px solid #ddd;">
    <div style="background-color: #2563EB; color: white; padding: 16px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">🏨CasaStay</h1>
      <p style="margin: 4px 0; font-size: 14px;">Your comfort, our priority</p>
    </div>

    <div style="padding: 20px;">
      <h2 style="color: #2E86C1;">Booking Confirmation ✅</h2>
      <p>Dear ${booking.userId?.name || 'Guest'},</p>
      <p>Your booking has been successfully confirmed.</p>

      <h3 style="color: #2E86C1;">Booking Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0;"><strong>Hotel:</strong></td><td>${hotelName}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Check‑in:</strong></td><td>${checkInStr}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Check‑out:</strong></td><td>${checkOutStr}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Guests:</strong></td><td>${booking.guests}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Original Amount:</strong></td><td>₹${booking.totalAmount}</td></tr>
        ${booking.discountAmount ? `<tr><td style="padding: 6px 0;"><strong>Discount:</strong></td><td>-₹${booking.discountAmount}</td></tr>` : ''}
        ${booking.loyaltyCoinsUsed ? `<tr><td style="padding: 6px 0;"><strong>Loyalty Coins Used:</strong></td><td>-₹${booking.loyaltyCoinsUsed}</td></tr>` : ''}
        <tr><td style="padding: 6px 0;"><strong>Total Paid:</strong></td><td>₹${totalPaid}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Status:</strong></td><td>${booking.status || 'booked'} / ${booking.paymentStatus || 'paid'}</td></tr>
        ${booking.paymentReceiptUrl ? `<tr><td style="padding: 6px 0;"><strong>Receipt:</strong></td><td><a href="${booking.paymentReceiptUrl}">View receipt</a></td></tr>` : ''}
      </table>

      ${
        booking.loyaltyCoinsEarned > 0
          ? `<div style="margin-top: 10px; padding: 10px; background: #FFF9DB; border: 1px solid #FDE68A; border-radius: 6px;">
               <strong>Perk:</strong> You earned ${booking.loyaltyCoinsEarned} loyalty coin${booking.loyaltyCoinsEarned > 1 ? 's' : ''} on this booking.
             </div>`
          : ''
      }

      <h3 style="color: #C0392B; margin-top: 16px;">Emergency Contact</h3>
      <p>
        ${emergencyContact.role ? `${emergencyContact.role}: ` : ''}${emergencyContact.name || 'On-duty Manager'}<br/>
        ${emergencyContact.phone ? `<a href="tel:${emergencyContact.phone}">${emergencyContact.phone}</a>` : 'Provided at front desk'}<br/>
        ${emergencyContact.availableHours ? `Hours: ${emergencyContact.availableHours}` : ''}
      </p>
  `;

  if (Array.isArray(offers) && offers.length > 0) {
    html += `
      <h3 style="color: #27AE60;">Special Offers Available 🎁</h3>
      <ul style="padding-left: 20px;">`;

    offers.forEach((o) => {
      let discountText = "Special offer";
      if (o.discountPercent) discountText = `${o.discountPercent}% off`;
      else if (o.discountFlat) discountText = `₹${o.discountFlat} off`;

      const until = o.validTo ? `(valid until ${new Date(o.validTo).toLocaleDateString()})` : "";

      html += `
        <li>
          <strong>${o.code}</strong> – ${discountText} ${until}<br/>
          ${o.description || ""}
        </li>
      `;
    });

    html += `</ul>`;
  }

  html += `
      <p style="margin-top: 20px;">We look forward to hosting you. If you have any questions, feel free to contact the emergency contact above or our front desk anytime.</p>
    </div>

    <div style="background-color: #f4f4f4; padding: 16px; text-align: center; font-size: 12px; color: #777;">
      <p style="margin: 4px 0;">CasaStay · 123 Comfort Lane · India</p>
      <p style="margin: 4px 0;">This is an automated message. Please do not reply.</p>
    </div>
  </div>
  `;

  return html;
};
