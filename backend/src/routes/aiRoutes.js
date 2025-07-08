import express from 'express';
import { generateDescription } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate-description', protect, generateDescription);

export default router;
