import express from "express";
import { getAvailabilitySummary } from "../controllers/availability.controller.js";

const router = express.Router();

// GET /availability?hotelId=xxx&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/", getAvailabilitySummary);

export default router;
