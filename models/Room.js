import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    type: {
      type: String,
      enum: ["Standard", "Deluxe", "Suite"],
      required: true,
    },
    bedType: {
      type: String,
      enum: ["King", "Queen", "Twin"],
      required: true,
    },
    view: {
      type: String,
      enum: ["Sea", "City", "Courtyard"],
      default: "City",
    },
    description: String,
    price: Number,
    capacity: {
      adults: Number,
      children: Number,
    },
    amenities: [String],
    images: [
      {
        url: String,
        public_id: String,
      },
    ],
    availability: [
      {
        date: String,
        isAvailable: Boolean,
        totalRooms: Number,
        bookedRooms: Number,
      },
    ],
  },
  { timestamps: true }
);

// Virtual for display name
roomSchema.virtual("displayName").get(function () {
  return `${this.type} ${this.bedType} (${this.view} view)`;
});

export default mongoose.model("Room", roomSchema);
