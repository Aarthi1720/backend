import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: {
      city: String,
      state: String,
      country: String,
      coordinates: {
        type: { type: String, default: "Point" },
        coordinates: [Number], // [lng, lat]
      },
    },
    address: String,
    description: String,
    amenities: [String],
    images: [
      {
        url: String,
        public_id: String,
      },
    ],
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    emergencyContact: {
      name: String,
      phone: String,
      role: { type: String, default: "Hotel Manager" },
      availableHours: String, // e.g., "24/7" or "9am–9pm"
    },
    rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Room" }],
  },
  { timestamps: true }
);

// models/Hotel.js
hotelSchema.index({ "location.coordinates": "2dsphere" });

export default mongoose.model("Hotel", hotelSchema);
