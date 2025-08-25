# 🏨 Hotel Booking System – Backend

This is the backend of the Hotel Booking System built using **Node.js**, **Express**, **MongoDB**, and **Mongoose**. It handles all the core business logic: authentication, hotel and room management, booking, reviews, payments, and admin functionalities.

---

## 🚀 Features

- 🔐 JWT Authentication (User & Admin)
- 🛏️ Room & Hotel Management
- 📅 Booking Management with Availability Logic
- 💳 Razorpay or Stripe Payment Integration
- 📝 Ratings and Review System with Admin Moderation
- 🎁 Special Offers / Promo Code Handling
- 📊 Admin Dashboard & Analytics
- ☁️ Cloudinary for Image Uploads
- 🆔 ID Verification (manual/online)
- ✉️ Email Notifications (if configured)

---

## 🛠️ Tech Stack

- **Node.js**, **Express.js**
- **MongoDB** + **Mongoose**
- **JWT**, **bcryptjs**
- **Cloudinary**
- **Razorpay** or **Stripe**
- **dotenv**, **multer**

---

## 📂 Folder Structure

backend/
├── config/ # Cloudinary, DB connection
│ └── cloudinary.js
│ └── db.js
│
├── controllers/ # API logic (hotels, users, bookings, etc.)
│ └── authController.js
│ └── hotelController.js
│ └── bookingController.js
│ └── reviewController.js
│ └── offerController.js
│ └── adminController.js
│
├── middleware/ # Auth and error handling
│ └── auth.js
│ └── errorHandler.js
│
├── models/ # Mongoose models
│ └── User.js
│ └── Hotel.js
│ └── Room.js
│ └── Booking.js
│ └── Offer.js
│ └── Review.js
│
├── routes/ # All routes
│ └── authRoutes.js
│ └── hotelRoutes.js
│ └── bookingRoutes.js
│ └── reviewRoutes.js
│ └── offerRoutes.js
│ └── adminRoutes.js
│
├── utils/ # Utilities (email, validators, etc.)
│
├── .env # Environment variables
├── .gitignore # Ignored files
├── package.json
├── server.js # App entry point

---

## ⚙️ Environment Variables

Create a `.env` file in `/backend` with the following:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```
---

## ▶️ Run Locally

```cd backend
npm install
npm run dev
```
---

## 📦 API Base URL

```http://localhost:5000/api```



