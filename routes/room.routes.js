import express from "express";
import multer from "multer";
import { storage } from "../config/cloudinary.js";
import {
  getRoomsByHotel,
  createRoom,
  deleteRoom,
} from "../controllers/room.controller.js";

const upload = multer({ storage });
const router = express.Router();

router.post("/create", upload.array("images", 5), createRoom);
router.get("/:hotelId", getRoomsByHotel);
router.delete("/:roomId", deleteRoom);

export default router;
