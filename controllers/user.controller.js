import User from "../models/User.js";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

// GET /api/users/me
export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id)
    .select("-password")
    .populate("favorites");
  res.json(user);
};

// PUT /api/users/me
export const updateMe = async (req, res) => {
  try {
    const updates = {};

    if (req.body?.name) updates.name = req.body.name;
    if (req.body?.email) updates.email = req.body.email;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ If uploading new file, reset status
    if (req.file && user.role !== "admin") {
      updates.idVerification = {
        documentUrl: `/${req.file.path.replace(/\\/g, "/")}`,
        status: "pending",
        method: "manual",
      };
    }

    // ✅ Extra safeguard: if frontend sent "forcePending", reset status
    if (req.body?.forcePending === "true" && user.role !== "admin") {
      if (user.idVerification) {
        updates.idVerification = {
          ...user.idVerification.toObject?.() ?? user.idVerification,
          status: "pending",
        };
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    }).select("-password");

    res.json(updatedUser);
  } catch (err) {
    console.error("updateMe error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};


export const getFavorites = async (req, res) => {
  const user = await User.findById(req.user.id).populate("favorites");
  res.json(user.favorites);
};

export const addFavorite = async (req, res) => {
  await User.findByIdAndUpdate(req.user?.id, {
    $addToSet: { favorites: req.params.hotelId },
  });
  res.json({ message: "Added to favorites" });
};

export const removeFavorite = async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { favorites: req.params.hotelId },
  });
  res.json({ message: "Removed from favorites" });
};

const UPLOAD_ROOT = path.resolve("uploads");

export const removeIdDocument = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.idVerification?.documentUrl) {
      return res.status(404).json({ message: "No ID document found" });
    }

    // Clean up document path (e.g. "/uploads/ids/abc.png" → "uploads/ids/abc.png")
    const relPath = user.idVerification.documentUrl.replace(/^\/+/, "");
    const absPath = path.resolve(UPLOAD_ROOT, path.relative("uploads", relPath));

    // Delete file safely
    if (absPath.startsWith(UPLOAD_ROOT) && fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }

    // Reset KYC state
    user.idVerification.documentUrl = null;  // ✅ null instead of ""
    user.idVerification.status = "pending";
    user.idVerification.method = user.idVerification.method || "manual";

    await user.save();

    res.json({ message: "ID document removed and KYC reset to pending" });
  } catch (err) {
    console.error("Failed to remove ID document:", err);
    res.status(500).json({ message: "Server error" });
  }
};