import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOtpEmail } from "../services/emailTemplates/sendOtpEmail.js";
import { sendWelcomeEmail } from "../services/emailTemplates/sendWelcomeEmail.js";

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing)
    return res.status(400).json({ message: "Email already exists" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const user = await User.create({
    name,
    email,
    password, // plain password; will be hashed via pre-save hook
    isVerified: false,
    verificationOtp: otp,
    verificationOtpExpiry: Date.now() + 10 * 60 * 1000,
  });

  await sendOtpEmail(email, otp);
  res.status(201).json({ message: "OTP sent for verification" });
};

export const verifyOtpAndActivateUser = async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (
    !user ||
    user.verificationOtp !== otp ||
    Date.now() > user.verificationOtpExpiry
  ) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  user.isVerified = true;
  user.verificationOtp = undefined;
  user.verificationOtpExpiry = undefined;
  await user.save();
  await sendWelcomeEmail(user.email, user.name);

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    message: "Account verified and logged in",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ message: "Invalid credentials" });

  if (!user.isVerified) {
    return res
      .status(403)
      .json({
        message: "Please verify your account via OTP before logging in",
      });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

export const verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user || user.resetOtp !== otp || Date.now() > user.resetOtpExpiry) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  res.json({ message: "OTP verified" });
};

export const resendVerificationOtp = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.isVerified)
    return res.status(400).json({ message: "User already verified" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.verificationOtp = otp;
  user.verificationOtpExpiry = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendOtpEmail(email, otp);
  res.json({ message: "New OTP sent to your email" });
};

export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
  user.resetOtp = otp;
  user.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  await sendOtpEmail(user.email, otp); // ✅ uses your email template
  res.json({ message: "OTP sent to your email" });
};

export const resetPasswordWithOtp = async (req, res) => {
  const { email, otp, password } = req.body;

  console.log("Incoming reset:", { email, otp, password });
  const user = await User.findOne({ email });
  console.log("Found user:", user?.email);
  console.log("Stored OTP:", user?.resetOtp);
  console.log("Expiry:", user?.resetOtpExpiry, "Now:", Date.now());
  if (!user || user.resetOtp !== otp || Date.now() > user.resetOtpExpiry) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  user.password = password; // hash in pre-save hook
  user.resetOtp = undefined;
  user.resetOtpExpiry = undefined;
  await user.save();

  res.json({ message: "Password reset successful" });
};
