import express from 'express';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierDebts,
  addDebtToSupplier,
  getSupplierCredits,
  addCreditToSupplier,
  deleteTransaction,
  getAllDebts,
  getAllCredits,
} from '../controllers/supplierController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes for suppliers
router.route('/')
  .get(protect, getSuppliers)
  .post(protect, createSupplier);

router.route('/:id')
  .put(protect, updateSupplier)
  .delete(protect, admin, deleteSupplier);

// Routes for getting ALL debts and credits
router.route('/alldebts').get(protect, getAllDebts);
router.route('/allcredits').get(protect, getAllCredits);


// Routes for a specific supplier's debts and credits
router.route('/:id/debts')
    .get(protect, getSupplierDebts)
    .post(protect, addDebtToSupplier);
    
router.route('/:id/credits')
    .get(protect, getSupplierCredits)
    .post(protect, addCreditToSupplier);

// Route to delete a specific transaction (debt or credit)
router.delete('/transactions/:type/:transactionId', protect, admin, deleteTransaction);

export default router;
