import mongoose from 'mongoose';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { bookingsOverlap } from '../utils/dateOverlap.js';
import { ymdToUtcDate, formatYmd } from '../utils/date.js';

export const getAvailabilitySummary = async (req, res) => {
  try {
    const { hotelId, startDate, endDate } = req.query;

    if (!hotelId || !startDate || !endDate) {
      return res.status(400).json({ error: 'hotelId, startDate, and endDate are required' });
    }

    const start = ymdToUtcDate(startDate);
    const end   = ymdToUtcDate(endDate);

    if (isNaN(start) || isNaN(end) || end <= start) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    const hotelObjectId = new mongoose.Types.ObjectId(hotelId);
    const rooms = await Room.find({ hotelId: hotelObjectId }).select('_id').lean();
    const totalRooms = rooms.length;
    const roomIds = rooms.map(r => String(r._id));

    if (totalRooms === 0) {
      return res.json({
        availableRoomIds: [],
        summary: { available: 0, total: 0 },
        perDate: []
      });
    }

    const bookings = await Booking.find({
      hotelId: hotelObjectId,
      status: { $in: ['booked', 'checkedIn', 'pending', 'completed'] }
    }).select('roomId checkIn checkOut').lean();

    const bookedSet = new Set(
      bookings
        .filter(b => bookingsOverlap(b.checkIn, b.checkOut, start, end))
        .map(b => String(b.roomId))
    );

    const availableRoomIds = roomIds.filter(id => !bookedSet.has(id));

    // Build per-day for [start, end)
    const perDate = [];
    for (let d = new Date(start); d < end; d = new Date(d.getTime() + 24*60*60*1000)) {
      const dayStart = new Date(d);
      const dayEnd = new Date(d.getTime() + 24*60*60*1000);

      const blockedThatDay = bookings.filter(b =>
        bookingsOverlap(b.checkIn, b.checkOut, dayStart, dayEnd)
      ).length;

      perDate.push({
        date: formatYmd(dayStart),
        available: Math.max(0, totalRooms - blockedThatDay),
        total: totalRooms
      });
    }

    return res.json({
      availableRoomIds,
      summary: { available: availableRoomIds.length, total: totalRooms },
      perDate
    });
  } catch (err) {
    console.error('Error fetching availability:', err);
    return res.status(500).json({ error: 'Server error while fetching availability' });
  }
};
