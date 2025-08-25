import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "Invalid token user" });

    // Attach normalized fields for convenience and reliability across controllers
    req.user = user;
    req.user.id = user._id.toString();
    req.user.isAdmin = user.role === "admin";

    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const verifyAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access denied" });
  next();
};
