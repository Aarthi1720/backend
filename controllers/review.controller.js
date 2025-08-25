import Review from "../models/Review.js";
import Hotel from "../models/Hotel.js";
import Booking from "../models/Booking.js";

// Helper: recalc hotel ratings from approved reviews only
const recalcHotelRating = async (hotelId) => {
  const approved = await Review.find({ hotelId, isApproved: true })
    .select("rating")
    .lean();
  const ratingCount = approved.length;
  const ratingSum = approved.reduce(
    (sum, r) => sum + (Number(r.rating) || 0),
    0
  );
  const ratingAvg = ratingCount ? ratingSum / ratingCount : 0;
  await Hotel.findByIdAndUpdate(hotelId, { ratingAvg, ratingCount });
};

// Helper: verified stay check
const hasEligibleCompletedStay = async (userId, hotelId) => {
  const now = new Date();
  const count = await Booking.countDocuments({
    userId,
    hotelId,
    paymentStatus: "paid",
    status: { $ne: "cancelled" },
    checkOut: { $lt: now },
  });
  return count > 0;
};

const getClientIp = (req) => {
  const xf = (req.headers["x-forwarded-for"] || "").toString();
  if (xf) return xf.split(",")[0].trim();
  return (req.ip || "").toString();
};

const clamp = (num, min, max) => Math.max(min, Math.min(max, num));
const MIN_COMMENT_LEN = 10;
const MAX_COMMENT_LEN = 1000;

export const getMyReviewForHotel = async (req, res) => {
  try {
    const userId = req.user.id;
    const { hotelId } = req.query;
    if (!hotelId) return res.status(400).json({ error: "hotelId required" });

    const review = await Review.findOne({ userId, hotelId }).lean();
    return res.json(review || null);
  } catch (err) {
    console.error("getMyReviewForHotel error:", err);
    return res.status(500).json({ error: "Failed to fetch review" });
  }
};

export const createOrUpdateReview = async (req, res) => {
  try {
    const { hotelId, roomId, rating, comment } = req.body;
    const userId = req.user.id;

    if (!hotelId || rating == null || !comment) {
      return res
        .status(400)
        .json({ error: "hotelId, rating, and comment are required" });
    }

    const ratingNum = clamp(Number(rating) || 0, 1, 5);
    const commentStr = String(comment).trim().slice(0, MAX_COMMENT_LEN);
    if (commentStr.length < MIN_COMMENT_LEN) {
      return res
        .status(400)
        .json({
          error: `Comment must be at least ${MIN_COMMENT_LEN} characters`,
        });
    }

    const eligible = await hasEligibleCompletedStay(userId, hotelId);
    if (!eligible) {
      return res
        .status(403)
        .json({ error: "You can review only after completing a paid stay." });
    }

    const ip = getClientIp(req);
    let review = await Review.findOne({ userId, hotelId });
    let isNew = false;

    if (review) {
      const shouldResetApproval = review.isApproved && !req.user.isAdmin;
      review.rating = ratingNum;
      review.comment = commentStr;
      review.roomId = roomId || review.roomId;
      review.ip = ip;
      if (shouldResetApproval) review.isApproved = false;
      await review.save();
    } else {
      isNew = true;
      review = await Review.create({
        userId,
        hotelId,
        roomId: roomId || undefined,
        rating: ratingNum,
        comment: commentStr,
        ip,
        isApproved: false,
      });
    }

    await recalcHotelRating(hotelId);

    return res.status(isNew ? 201 : 200).json({
      message: isNew ? "Review created" : "Review updated",
      review: { ...review.toObject(), verifiedBooking: true },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({
          error:
            "You already reviewed this hotel. Edit your existing review instead.",
        });
    }
    console.error("createOrUpdateReview error:", err);
    return res.status(500).json({ error: "Failed to submit review" });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });

    const isOwner = review.userId.toString() === req.user.id;
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (isOwner && review.isApproved) review.isApproved = false;

    if (rating != null) review.rating = clamp(Number(rating) || 0, 1, 5);
    if (comment != null) {
      const c = String(comment).trim().slice(0, MAX_COMMENT_LEN);
      if (c.length < MIN_COMMENT_LEN) {
        return res
          .status(400)
          .json({
            error: `Comment must be at least ${MIN_COMMENT_LEN} characters`,
          });
      }
      review.comment = c;
    }

    review.ip = getClientIp(req);
    await review.save();
    await recalcHotelRating(review.hotelId);

    const verifiedBooking = await hasEligibleCompletedStay(
      review.userId,
      review.hotelId
    );
    return res.json({
      message: "Review updated",
      review: { ...review.toObject(), verifiedBooking },
    });
  } catch (err) {
    console.error("updateReview error:", err);
    return res.status(500).json({ error: "Failed to update review" });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });

    if (review.userId.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await Review.findByIdAndDelete(req.params.id);
    await recalcHotelRating(review.hotelId);

    return res.json({ message: "Review deleted" });
  } catch (err) {
    console.error("deleteReview error:", err);
    return res.status(500).json({ error: "Failed to delete review" });
  }
};

export const getReviewsForHotel = async (req, res) => {
  try {
    const {
      sort = "newest",
      verifiedOnly = "false",
      limit = 10,
      page = 1,
    } = req.query;

    let sortQuery = { createdAt: -1 };
    if (sort === "highest") sortQuery = { rating: -1, createdAt: -1 };
    if (sort === "lowest") sortQuery = { rating: 1, createdAt: -1 };

    let reviews = await Review.find({
      hotelId: req.params.hotelId,
      isApproved: true,
    })
      .populate("userId", "name")
      .sort(sortQuery)
      .skip((page - 1) * Math.min(limit, 50))
      .limit(Math.min(limit, 50))
      .lean();

    const verifiedUserIds = await Booking.distinct("userId", {
      hotelId: req.params.hotelId,
      paymentStatus: "paid",
      status: { $ne: "cancelled" },
      checkOut: { $lt: new Date() },
    });

    const verifiedSet = new Set(verifiedUserIds.map(String));

    reviews = reviews.map((r) => ({
      ...r,
      verifiedBooking: verifiedSet.has(r.userId?._id?.toString()),
    }));

    if (verifiedOnly === "true") {
      reviews = reviews.filter((r) => r.verifiedBooking);
    }

    return res.json(reviews);
  } catch (err) {
    console.error("getReviewsForHotel error:", err);
    return res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

export const getReviewEligibility = async (req, res) => {
  try {
    const userId = req.user.id;
    const { hotelId } = req.params;
    if (!hotelId) return res.status(400).json({ eligible: false });

    const eligible = await hasEligibleCompletedStay(userId, hotelId);
    return res.json({ eligible });
  } catch (err) {
    console.error("getReviewEligibility error:", err);
    return res.status(200).json({ eligible: false });
  }
};

export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("userId hotelId roomId")
      .sort({ createdAt: -1 });
    return res.json(reviews);
  } catch (err) {
    console.error("getAllReviews error:", err);
    return res.status(500).json({ error: "Failed to fetch all reviews" });
  }
};

export const approveReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!review) return res.status(404).json({ error: "Review not found" });

    await recalcHotelRating(review.hotelId);
    return res.json({ message: "Review approved", review });
  } catch (err) {
    console.error("approveReview error:", err);
    return res.status(500).json({ error: "Failed to approve review" });
  }
};

export const toggleReviewApproval = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });

    review.isApproved = !review.isApproved;
    await review.save();
    await recalcHotelRating(review.hotelId);

    return res.json({
      message: `Review ${review.isApproved ? "approved" : "hidden"}`,
      review,
    });
  } catch (err) {
    console.error("toggleReviewApproval error:", err);
    return res.status(500).json({ error: "Failed to toggle review" });
  }
};

export const getPendingReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isApproved: false })
      .populate("userId", "name email")
      .populate("hotelId", "name")
      .populate("roomId", "name")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error("getPendingReviews error:", err);
    res.status(500).json({ error: "Failed to fetch pending reviews" });
  }
};

export const approveAllPendingReviews = async (req, res) => {
  try {
    const result = await Review.updateMany(
      { isApproved: false },
      { $set: { isApproved: true } }
    );

    const hotelIds = await Review.distinct("hotelId", { isApproved: true });
    await Promise.all(hotelIds.map(recalcHotelRating));

    res.json({ message: `Approved ${result.modifiedCount} reviews` });
  } catch (err) {
    console.error("approveAllPendingReviews error:", err);
    res.status(500).json({ error: "Failed to approve all reviews" });
  }
};
