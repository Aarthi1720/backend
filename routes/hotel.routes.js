import express from "express";
import multer from "multer";
import { storage } from "../config/cloudinary.js";
import {
  createHotel,
  getHotels,
  getHotelById,
  uploadHotelImage,
  deleteHotelImage,
  searchHotelsWithAvailability,
} from "../controllers/hotel.controller.js";
import { getAvailableRooms } from "../controllers/room.controller.js";
import { getCalendarAvailability } from "../controllers/calendar.controller.js";

const upload = multer({ storage });
const router = express.Router();

router.post("/", createHotel);
router.get("/search-availability", searchHotelsWithAvailability);
router.get("/", getHotels);
router.post("/:id/upload-image", upload.array("images", 5), uploadHotelImage);
router.delete("/:hotelId/images", deleteHotelImage);
router.get("/:id", getHotelById);
router.get("/:hotelId/available-rooms", getAvailableRooms);
router.get("/:hotelId/availability", getCalendarAvailability);

export default router;
