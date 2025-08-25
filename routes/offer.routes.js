import express from "express";
import Offer from "../models/Offer.js";
import {
  applyOffer,
  updateOffer,
  createOffer,
  getOffers,
  deactivateOffer,
} from "../controllers/offer.controller.js";
import { verifyAdmin, verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Public: list active offers (optionally limit for homepage)
router.get("/public", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 4, 12)); // default 4, cap 12
    const offers = await Offer.find({
      isActive: true,
      validTo: { $gte: new Date() },
    })
      .sort({ validFrom: -1 })
      .limit(limit)
      .populate({ path: "hotelId", select: "name location" });

    res.json({ offers });
  } catch (error) {
    console.error("Error fetching public offers:", error);
    res.status(500).json({ message: "Failed to fetch public offers" });
  }
});

router.get("/hotel/:hotelId", async (req, res) => {
  try {
    const { hotelId } = req.params;
    const now = new Date();

    const offers = await Offer.find({
      hotelId,
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
    }).sort({ validFrom: -1 });

    res.json(offers);
  } catch (error) {
    console.error("Error fetching hotel offers:", error);
    res.status(500).json({ message: "Failed to fetch hotel offers" });
  }
});

// Admin routes
router.post("/", verifyToken, verifyAdmin, createOffer);
router.get("/", verifyToken, verifyAdmin, getOffers);
router.post("/apply", applyOffer);
router.put("/:id", verifyToken, verifyAdmin, updateOffer);
router.patch("/:id/deactivate", verifyToken, verifyAdmin, deactivateOffer);

export default router;
