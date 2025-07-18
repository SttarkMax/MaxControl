import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Sales and Admin can manage customers
router.route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

router.route('/:id')
  .get(protect, getCustomerById)
  .put(protect, updateCustomer)
  .delete(protect, deleteCustomer);

export default router;
