import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import { bookingsOverlap } from "../utils/dateOverlap.js";
import { ymdToUtcDate, formatYmd } from "../utils/date.js";

export const getCalendarAvailability = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const { month, year, guests, startDate, endDate } = req.query;

    if (!hotelId || !month || !year) {
      return res
        .status(400)
        .json({ message: "hotelId, month, and year are required" });
    }

    const monthNum = Number(month) - 1;
    const yearNum = Number(year);

    // Month bounds in UTC
    const monthStart = new Date(Date.UTC(yearNum, monthNum, 1));
    const monthEndExclusive = new Date(Date.UTC(yearNum, monthNum + 1, 1)); // exclusive

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
      checkIn: { $lt: monthEndExclusive },
      checkOut: { $gt: monthStart },
    }).lean();

    // Per-day availability for the entire month (UTC)
    const perDate = [];
    for (
      let d = new Date(monthStart);
      d < monthEndExclusive;
      d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
    ) {
      const dayStart = new Date(d);
      const dayEnd = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      const blockedSet = new Set(
        bookings
          .filter((b) =>
            bookingsOverlap(b.checkIn, b.checkOut, dayStart, dayEnd)
          )
          .map((b) => String(b.roomId))
      );
      const availableCount = rooms.filter(
        (r) => !blockedSet.has(String(r._id))
      ).length;

      perDate.push({
        date: formatYmd(dayStart),
        available: availableCount,
        total: rooms.length,
      });
    }

    // Summary for an optional [startDate, endDate)
    let summary = null;
    let roomsWithAvailability = rooms.map((r) => ({ ...r, available: true }));
    if (startDate && endDate) {
      const s = ymdToUtcDate(startDate);
      const e = ymdToUtcDate(endDate);
      if (!isNaN(s) && !isNaN(e) && e > s) {
        const blockedIds = await Booking.distinct("roomId", {
          hotelId,
          status: { $in: ["booked", "checkedIn", "pending", "completed"] },
          checkIn: { $lt: e },
          checkOut: { $gt: s },
        });

        const blockedSet = new Set(blockedIds.map(String));
        roomsWithAvailability = rooms.map((r) => ({
          ...r,
          available: !blockedSet.has(String(r._id)),
        }));
        const availableCount = roomsWithAvailability.filter(
          (r) => r.available
        ).length;
        summary = { available: availableCount, total: rooms.length };
      }
    }

    res.json({
      perDate,
      summary,
      rooms: roomsWithAvailability,
    });
  } catch (err) {
    console.error("Error in getCalendarAvailability:", err);
    next(err);
  }
};
