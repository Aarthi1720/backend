
# 🏨 CasaStay – Hotel Booking System (Backend)

This is the **backend service** for CasaStay, built with **Node.js + Express + MongoDB**, powering hotel management, bookings, payments, reviews, and admin analytics.

---

## ⚙️ Features (Backend Logic)

### 👤 Authentication
- ✅ OTP-based email verification on signup.  
- 🔑 JWT auth with role-based access (user/admin).  
- 🔄 Password reset via OTP.  
- 🛡️ Secure password hashing with bcrypt.  

### 🏨 Hotels & Rooms
- ➕ Add, update, delete hotels and rooms.  
- 📸 Hotel images & room descriptions.  
- 📅 Availability management per room.  

### 📦 Bookings
- 🛏️ Create bookings with check-in/out, guests, and special requests.  
- 💳 Stripe payment integration (webhooks for confirmation).  
- 📜 Booking history & status (paid, pending, cancelled).  

### 💬 Reviews
- ⭐ Only verified, paid users can review.  
- 🔍 Review moderation (pending, approved, rejected).  
- 📊 Average rating calculation with rating buckets.  

### 🎁 Offers & Loyalty
- 🎟️ Admin creates special offers with codes & validity.  
- 🪙 Loyalty coins awarded for eligible bookings (>₹1000).  
- 🔗 Applied automatically at checkout.  

### 👨‍💼 Admin Panel APIs
- 🏨 Manage hotels, rooms, offers.  
- 📊 View analytics: bookings, occupancy, revenue.  
- 📝 Approve/reject reviews.  
- 🛡️ Handle ID verification (manual/AI/ocr).  

---

## 🛠️ Tech Stack

- 🌐 **Express.js** – API framework.  
- 🗄️ **MongoDB + Mongoose** – Database & schema modeling.  
- 🔐 **JWT** – Auth tokens.  
- 🔑 **bcryptjs** – Password hashing.  
- 💌 **Nodemailer** – OTP / booking confirmation emails.  
- 💳 **Stripe** – Payments + webhook handling.  

---

## 🚀 Getting Started

```bash
# clone repo
git clone https://github.com/your-username/casastay-backend.git
cd casastay-backend

# install dependencies
npm install

# run locally
npm run dev
```

---

## 🔗 Environment Variables

```env

PORT=5000
MONGO_URI=your_mongo_connection
JWT_SECRET=your_secret_key
STRIPE_SECRET_KEY=your_stripe_secret
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
FRONTEND_URL=http://localhost:5173
```

---

## 📸 Highlights

- ✅ Email OTP verification

- ✅ Stripe webhook integration

- ✅ Loyalty coin system

- ✅ Verified stay review system

- ✅ Admin moderation tools

---

## 👨‍💻 Author

🚀 Built with ❤️ by Aarthi | MERN Stack Developer