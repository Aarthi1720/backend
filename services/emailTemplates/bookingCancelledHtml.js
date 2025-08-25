export const bookingCancelledHtml = (booking, emergencyContact, refund) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
      <h2 style="color:#d9534f;">Your booking has been cancelled</h2>
      <p>Hello ${booking.userId?.name || "Guest"},</p>
      
      <p>
        Your booking at <strong>${booking.hotelId?.name || "our hotel"}</strong> 
        from <strong>${new Date(booking.checkIn).toLocaleDateString()}</strong> 
        to <strong>${new Date(booking.checkOut).toLocaleDateString()}</strong> 
        has been <strong style="color:#d9534f;">cancelled</strong>.
      </p>

      ${
        refund
          ? `<p style="color:green;">
               A refund of <strong>₹${
  typeof booking.finalAmount === 'number'
    ? booking.finalAmount
    : Math.max(
        (booking.totalAmount || 0) -
        (booking.discountAmount || 0) -
        (booking.loyaltyCoinsUsed || 0),
        0
      )
}</strong> has been initiated. 
               Refund ID: <strong>${refund.id}</strong>.
             </p>`
          : `<p>No payment was made, so no refund is due.</p>`
      }

      <h3 style="margin-top:20px;">Booking Summary</h3>
      <ul>
        <li><strong>Hotel:</strong> ${booking.hotelId?.name || "N/A"}</li>
        <li><strong>Room:</strong> ${
  booking.roomId?.type
    ? `${booking.roomId.type} ${booking.roomId.bedType} (${booking.roomId.view} view)`
    : "N/A"
}</li>

        <li><strong>Guests:</strong> ${booking.guests || "N/A"}</li>
        <li><strong>Status:</strong> Cancelled</li>
      </ul>

      ${
        emergencyContact?.name
          ? `
          <h3 style="margin-top:20px;">Emergency Contact</h3>
          <p>
            ${emergencyContact.name} (${emergencyContact.role || "Staff"})<br/>
            Phone: ${emergencyContact.phone || "-"}<br/>
            Hours: ${emergencyContact.availableHours || "24/7"}
          </p>`
          : ""
      }

      <p style="margin-top:20px;">
        We’re sorry your plans changed. We look forward to hosting you in the future.
      </p>

      <p style="margin-top:30px;">Best regards,<br/>StayEase Hotels</p>
    </div>
  `;
};
