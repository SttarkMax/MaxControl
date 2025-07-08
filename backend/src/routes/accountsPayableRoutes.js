import express from 'express';
import {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  deleteEntrySeries,
} from '../controllers/accountsPayableController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only Admins can manage accounts payable
router.use(protect, admin);

router.route('/')
  .get(getEntries)
  .post(createEntry);

router.route('/series/:seriesId').delete(deleteEntrySeries);

router.route('/:id')
  .put(updateEntry)
  .delete(deleteEntry);

export default router;
