import express from 'express';
import {
  getCompanyInfo,
  updateCompanyInfo,
} from '../controllers/settingsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/company-info')
  .get(protect, getCompanyInfo) // Any logged-in user can see it (for headers, PDFs)
  .put(protect, admin, updateCompanyInfo); // Only admin can change it

export default router;
