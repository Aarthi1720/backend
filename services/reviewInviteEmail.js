import { transporter } from "../utils/email.js";
import { reviewInviteHtml } from "../mailer/emailTemplates/reviewInviteHtml.js";

export const sendReviewInviteEmail = async ({ booking }) => {
  const to = booking?.userId?.email;
  if (!to) return;

  await transporter.sendMail({
    from: `"CasaStay" <${process.env.EMAIL_USER}>`,
    to,
    subject: `How was your stay at ${booking?.hotelId?.name || "our hotel"}?`,
    html: reviewInviteHtml(booking),
  });
};
