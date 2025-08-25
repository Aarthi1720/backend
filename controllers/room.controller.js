import { ymdToUtcDate, formatYmd } from "../utils/date.js";
import { bookingsOverlap } from "../utils/dateOverlap.js";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import { deleteFromCloudinary } from "../config/cloudinary.js";
import mongoose from "mongoose";

export const createRoom = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    const { hotelId, type, bedType, view, description, price } = req.body;

    const capacity = {
      adults: parseInt(req.body["capacity.adults"]) || 0,
      children: parseInt(req.body["capacity.children"]) || 0,
    };

    let amenities = req.body["amenities[]"] || req.body.amenities || [];
    if (!Array.isArray(amenities)) {
      amenities = amenities ? [amenities] : [];
    }

    if (!Array.isArray(req.files)) {
      return res
        .status(400)
        .json({ error: "No images uploaded or incorrect format" });
    }

    const images = req.files.map((file) => ({
      url: file.path,
      public_id: file.filename,
    }));

    const room = await Room.create({
      hotelId,
      type,
      bedType,
      view,
      description,
      price: parseFloat(price),
      capacity,
      amenities,
      images,
    });

    res.status(201).json({ message: "Room created", room });
  } catch (err) {
    console.error("Room create error:", err);
    res.status(500).json({ error: err.message || "Failed to create room" });
  }
};

export const getRoomsByHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;

    if (!hotelId || !mongoose.Types.ObjectId.isValid(hotelId)) {
      return res.status(400).json({ error: "Invalid hotel ID format" });
    }

    const rooms = await Room.find({ hotelId });

    res.json(rooms);
  } catch (err) {
    console.error("getRoomsByHotel error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch rooms" });
  }
};

const getDatesInRange = (start, end) => {
  const dates = [];
  let current = new Date(start);
  while (current < end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
};

export const getAvailableRooms = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const { checkIn, checkOut, guests } = req.query;

    if (!hotelId || !checkIn || !checkOut) {
      return res
        .status(400)
        .json({ message: "hotelId, checkIn, and checkOut are required" });
    }

    const start = ymdToUtcDate(checkIn);
    const end = ymdToUtcDate(checkOut);

    if (isNaN(start) || isNaN(end) || end <= start) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    let rooms = await Room.find({ hotelId }).lean();

    if (guests) {
      const g = Number(guests);
      rooms = rooms.filter((r) => {
        const cap = (r.capacity?.adults || 0) + (r.capacity?.children || 0);
        return cap >= g;
      });
    }

    const bookings = await Booking.find({
      hotelId,
      status: { $in: ["booked", "checkedIn", "pending", "completed"] },
      checkIn: { $lt: end },
      checkOut: { $gt: start },
    }).lean();

    const days = getDatesInRange(start, end);

    const availableRooms = rooms.map((room) => {
      const roomBookings = bookings.filter(
        (b) => String(b.roomId) === String(room._id)
      );

      const availability = days.map((day) => {
        const nextDay = new Date(day);
        nextDay.setUTCDate(day.getUTCDate() + 1);

        const bookedCount = roomBookings.filter((b) =>
          bookingsOverlap(b.checkIn, b.checkOut, day, nextDay)
        ).length;

        return {
          date: formatYmd(day),
          isAvailable: bookedCount < (room.totalRooms || 1),
          totalRooms: room.totalRooms || 1,
          bookedRooms: bookedCount,
        };
      });

      return {
        ...room,
        availability,
        available: availability.every((d) => d.isAvailable),
      };
    });

    res.json({ rooms: availableRooms });
  } catch (err) {
    console.error("Error in getAvailableRooms:", err);
    next(err);
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    for (const img of room.images) {
      if (img.public_id) {
        await deleteFromCloudinary(img.public_id);
      }
    }

    await room.deleteOne();

    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    console.error("Delete room error:", err);
    res.status(500).json({ message: "Failed to delete room" });
  }
};
