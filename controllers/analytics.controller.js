import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import Review from "../models/Review.js";

export const getAnalytics = async (req, res) => {
  try {
    const bookings = await Booking.find();
    const rooms = await Room.find();
    const reviews = await Review.find({ approved: true });

    // Monthly trends
    const monthlyBookings = Array(12).fill(0);
    const monthlyRevenue = Array(12).fill(0);
    const monthLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    bookings.forEach((b) => {
      const month = new Date(b.checkIn).getMonth(); // 0-11
      monthlyBookings[month]++;
      monthlyRevenue[month] += b.finalAmount || 0;
    });

    // Occupancy (based on confirmed bookings)
    const confirmedBookings = bookings.filter((b) => b.status === "booked");
    const totalRooms = rooms.length;
    const bookedRooms = confirmedBookings.length;

    // Overall stats
    const totalRevenue = bookings.reduce(
      (sum, b) => sum + (b.finalAmount || 0),
      0
    );
    const avgRating = reviews.length
      ? (
          reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
          reviews.length
        ).toFixed(1)
      : 0;

    const occupancyRate =
      totalRooms > 0 ? ((bookedRooms / totalRooms) * 100).toFixed(1) : 0;

    res.json({
      // For AnalyticsTab.jsx
      totalBookings: bookings.length,
      totalRevenue,
      occupancyRate,
      avgRating,

      // For AdminAnalytics.jsx
      labels: monthLabels,
      bookings: monthlyBookings,
      revenue: monthlyRevenue,
      occupancy: {
        booked: bookedRooms,
        available: totalRooms - bookedRooms,
      },
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res
      .status(500)
      .json({ message: "Failed to load analytics", error: err.message });
  }
};
