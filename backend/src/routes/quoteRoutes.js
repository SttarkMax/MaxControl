import express from 'express';
import {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
} from '../controllers/quoteController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getQuotes)
  .post(protect, createQuote);

router.route('/:id')
  .get(protect, getQuoteById)
  .put(protect, updateQuote)
  .delete(protect, deleteQuote);

export default router;
