import { sendEmail } from '../../utils/email.js';

// export const sendWelcomeEmail = async (to, name) => {
//   const html = `
//     <div style="font-family: sans-serif; background: #f9f9f9; padding: 40px;">
//       <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
//         <header style="background: #2d89ef; color: white; padding: 20px; text-align: center;">
//           <h1>🏨 Hotel Booking</h1>
//         </header>

//         <main style="padding: 30px;">
//           <h2>Welcome, ${name}!</h2>
//           <p>We're thrilled to have you on board. Start exploring hotels, managing bookings, and earning loyalty coins.</p>
//           <p>If you ever need help, we're just an email away.</p>
//         </main>

//         <footer style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666;">
//           <p>Happy travels,</p>
//           <p>— The Hotel Booking Team</p>
//         </footer>
//       </div>
//     </div>
//   `;

//   await sendEmail(to, 'Welcome to Hotel Booking!', html, 'welcome');
// };


export const sendWelcomeEmail = async (to, name) => {
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
                <h2 style="margin-top: 0;">Hi ${name} 👋,</h2>
                <p>Welcome aboard! We're thrilled to have you as part of our travel-loving community 🌍.</p>
                <p>Start exploring top-rated hotels, manage your bookings, and earn loyalty coins with every stay.</p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://hotel-booking-frontend-beige.vercel.app/hotels" style="background: #2d89ef; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                    🏝️ Explore Hotels
                  </a>
                </div>

                <p>If you ever need help, we're just an email away. Happy travels!</p>
              </td>
            </tr>

            <tr>
              <td style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666;">
                <p>Follow us for travel tips & updates:</p>
                <div style="margin: 10px 0;">
                  <a href="https://facebook.com/hotelbooking" style="margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/24/733/733547.png" alt="Facebook" /></a>
                  <a href="https://twitter.com/hotelbooking" style="margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/24/733/733579.png" alt="Twitter" /></a>
                  <a href="https://instagram.com/hotelbooking" style="margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/24/733/733558.png" alt="Instagram" /></a>
                </div>
                <p>© ${new Date().getFullYear()} CasaStay. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  await sendEmail(to, 'Welcome to CasaStay!', html, 'welcome');
};
