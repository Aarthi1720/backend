import { sendEmail } from "../../utils/email.js";


// export const sendOtpEmail = async (to, otp, type = 'verification') => {
//   const isReset = type === 'reset';

//   const html = `
//     <div style="font-family: sans-serif; background: #f9f9f9; padding: 40px;">
//       <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
//         <header style="background: #2d89ef; color: white; padding: 20px; text-align: center;">
//           <h1>🏨 Hotel Booking</h1>
//         </header>

//         <main style="padding: 30px 30px 30px 30px; text-align: left;">
//           <h2 style="margin: 0 0 10px;">${isReset ? 'Password Reset OTP' : 'Account Verification OTP'}</h2>
//           <p style="margin: 0 0 10px;">Your one-time password (OTP) is:</p>
//           <h1 style="color: #2d89ef; font-size: 32px; margin: 0 0 20px;">${otp}</h1>
//           <p style="margin: 0 0 10px;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
//         </main>

//         <footer style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666;">
//           <p>Need help? Contact us at support@hotelbooking.com</p>
//           <p>© ${new Date().getFullYear()} Hotel Booking. All rights reserved.</p>
//         </footer>
//       </div>
//     </div>
//   `;

//   const subject = isReset
//     ? 'Your OTP for Password Reset'
//     : 'Your OTP for Account Verification';

//   await sendEmail(to, subject, html, 'otp'); // pass type for logging
// };

export const sendOtpEmail = async (to, otp, type = 'verification') => {
  const isReset = type === 'reset';

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); font-family: sans-serif;">
            <tr>
              <td style="background: #2d89ef; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">🏨 CasaStay</h1>
              </td>
            </tr>

            <tr>
              <td style="padding: 30px; text-align: left;">
                <h2 style="margin-top: 0;">${isReset ? 'Password Reset OTP' : 'Account Verification OTP'}</h2>
                <p>Your one-time password (OTP) is:</p>
                <h1 style="color: #2d89ef; font-size: 32px; margin: 20px 0;">${otp}</h1>
                <p>This OTP is valid for 10 minutes. Do not share it with anyone.</p>
              </td>
            </tr>

            <tr>
              <td style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666;">
                <p>Need help? Contact us at <a href="mailto:support@casastay.com">support@casastay.com</a></p>
                <p>© ${new Date().getFullYear()} CasaStay. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const subject = isReset
    ? 'Your OTP for Password Reset'
    : 'Your OTP for Account Verification';

  await sendEmail(to, subject, html, 'otp');
};
