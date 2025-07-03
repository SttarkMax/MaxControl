
import { Router } from 'express';
import authRouter from './auth.routes';
import companyInfoRouter from './companyInfo.routes';
import productsRouter from './products.routes';
import categoriesRouter from './categories.routes';
import customersRouter from './customers.routes';
import quotesRouter from './quotes.routes';
import usersRouter from './users.routes';
import accountsPayableRouter from './accountsPayable.routes';
import suppliersRouter from './suppliers.routes';

const router = Router();

router.use('/auth', authRouter);
router.use('/company-info', companyInfoRouter);
router.use('/products', productsRouter);
router.use('/categories', categoriesRouter);
router.use('/customers', customersRouter);
router.use('/quotes', quotesRouter);
router.use('/users', usersRouter);
router.use('/accounts-payable', accountsPayableRouter);
router.use('/suppliers', suppliersRouter);
// These are combined into the suppliers route
// router.use('/debts', debtsRouter); 
// router.use('/supplier-credits', supplierCreditsRouter);

export default router;
