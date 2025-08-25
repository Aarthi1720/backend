import express from "express";
import { createPaymentIntent } from "../controllers/payment.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/create-intent", verifyToken, createPaymentIntent);

export default router;
