import express from 'express';
import {
  getDashboardStats,
  getSalesChartData,
  getDraftQuotes,
  getRecentAcceptedQuotes
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All dashboard routes require login
router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/sales-chart', getSalesChartData);
router.get('/draft-quotes', getDraftQuotes);
router.get('/recent-accepted-quotes', getRecentAcceptedQuotes);


export default router;
