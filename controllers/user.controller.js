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

    // ✅ Block admins from uploading ID documents
    if (req.file && user.role !== "admin") {
      updates.idVerification = {
        documentUrl: `/${req.file.path.replace(/\\/g, "/")}`,
        status: "pending",
        method: "manual",
      };
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
  //     console.log('User:', req.user?.id);
  // console.log('Hotel ID param:', req.params.hotelId);
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

export const removeIdDocument = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.idVerification?.documentUrl) {
      return res.status(404).json({ message: "No ID document found" });
    }

    // Delete the file from the filesystem
    const filePath = path.join(path.resolve(), user.idVerification.documentUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from DB
    user.idVerification = undefined;
    await user.save();

    res.json({ message: "ID document removed" });
  } catch (err) {
    console.error("Failed to remove ID document:", err);
    res.status(500).json({ message: "Server error" });
  }
};
