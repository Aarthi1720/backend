import express from 'express';
import { getMe, updateMe, getFavorites, addFavorite, removeFavorite, removeIdDocument } from '../controllers/user.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, upload.single('idVerification'), updateMe); // ✅ now parses multipart
router.delete('/me/id-verification', verifyToken, removeIdDocument);
router.get('/favorites', verifyToken, getFavorites);
router.post('/favorites/:hotelId', verifyToken, addFavorite);
router.delete('/favorites/:hotelId', verifyToken, removeFavorite);

export default router;
