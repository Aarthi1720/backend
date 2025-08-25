import express from "express";
import { getAnalytics } from "../controllers/analytics.controller.js";
import { verifyAdmin, verifyToken } from "../middleware/auth.js";

const router = express.Router();
router.get("/", verifyToken, verifyAdmin, getAnalytics);
export default router;
