import mongoose from 'mongoose';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';

export const createHotel = async (req, res) => {
  try {
    const {
      name,
      location,
      address,
      description,
      amenities,
      emergencyContact
    } = req.body;

    const newHotel = new Hotel({
      name,
      location,
      address,
      description,
      amenities: Array.isArray(amenities) ? amenities : [],
      emergencyContact
    });

    const saved = await newHotel.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Hotel create error:", err);
    res.status(500).json({ message: "Failed to create hotel" });
  }
};


export const getHotels = async (req, res) => {
  try {
    const { location, amenities, page = 1, limit = 6, all } = req.query;
    const query = {};

    // 🔍 Location filter
    if (location) {
      query['location.city'] = { $regex: location, $options: 'i' };
    }

    // 🔍 Amenities filter
    if (amenities) {
      const arr = Array.isArray(amenities)
        ? amenities
        : amenities.split(',').map((a) => a.trim()).filter(Boolean);
      if (arr.length) query.amenities = { $all: arr };
    }

    // ✅ Return all hotels if `?all=true`
    if (all === 'true') {
      const hotels = await Hotel.find(query).sort({ createdAt: -1 });
      return res.json({
        hotels,
        total: hotels.length,
        page: 1,
        pages: 1
      });
    }

    // ✅ Otherwise use pagination
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 6);

    const [hotels, total] = await Promise.all([
      Hotel.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
      Hotel.countDocuments(query)
    ]);

    res.json({
      hotels,
      total,
      page: p,
      pages: Math.ceil(total / l)
    });
  } catch (err) {
    console.error('Failed to fetch hotels:', err);
    res.status(500).json({ message: 'Failed to fetch hotels' });
  }
};


export const getHotelById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message:'Invalid hotel ID' });
    }
    const hotel = await Hotel.findById(id)
      .populate({ path:'rooms', options:{ sort:{ price:1 } } });
    if (!hotel) {
      return res.status(404).json({ message:'Hotel not found' });
    }
    res.json(hotel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message:'Failed to fetch hotel' });
  }
};


export const uploadHotelImage = async (req, res) => {
  try {
    const images = req.files.map(file => ({
  url: file.path,               // Cloudinary URL
  public_id: file.filename,     // ✅ This works with multer-storage-cloudinary
}));

const hotel = await Hotel.findByIdAndUpdate(
  req.params.id,
  { $push: { images: { $each: images } } },
  { new: true }
);
    res.json({ message:'Images uploaded', hotel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message:'Failed to upload images' });
  }
};

export const searchHotelsWithAvailability = async (req, res) => {
  try {
    const { location, checkIn, checkOut, guests } = req.query;
    if (!checkIn||!checkOut) {
      return res.status(400).json({ message:'checkIn and checkOut are required' });
    }
    const inDate = new Date(checkIn), outDate = new Date(checkOut);
    const filter = {};
    if (location) filter['location.city']={ $regex:location,$options:'i' };

    const hotels = await Hotel.find(filter);
    if (!hotels.length) return res.json({ hotels:[] });

    const overlaps = await Booking.find({
      hotelId:{ $in: hotels.map(h=>h._id)},
      checkIn:{ $lt: outDate }, checkOut:{ $gt: inDate }
    });
    const booked = new Set(overlaps.map(b=>String(b.roomId)));

    const results = await Promise.all(hotels.map(async h=>{
      const rooms = await Room.find({ hotelId: h._id }).lean();
      const avail = rooms.filter(r=>!booked.has(String(r._id)))
        .filter(r=>{
          if (!guests) return true;
          const cap=(r.capacity?.adults||0)+(r.capacity?.children||0);
          return cap >= Number(guests);
        })
        .map(r=>({ ...r, available:true }));
      if (!avail.length) return null;
      return { ...h.toObject(), availableRooms: avail };
    }));

    res.json({ hotels: results.filter(Boolean) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message:'Failed to search hotels with availability' });
  }
};


export const deleteHotelImage = async (req, res) => {
  console.log("Incoming DELETE req.body:", req.body);
  const { hotelId } = req.params;
  const { public_id } = req.body;

  if (!public_id) {
    return res.status(400).json({ message: "Missing public_id" });
  }

  try {
    await deleteFromCloudinary(public_id);

    const hotel = await Hotel.findByIdAndUpdate(
      hotelId,
      { $pull: { images: { public_id } } },
      { new: true }
    );

    res.json({ message: 'Image deleted', hotel });
  } catch (err) {
    console.error("Delete image error:", err);
    res.status(500).json({ message: 'Delete failed' });
  }
};

