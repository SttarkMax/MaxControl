
import { Router } from 'express';
import pool from '../db';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { Supplier, Debt, SupplierCredit, UserAccessLevel } from '../types';
import { RowDataPacket } from 'mysql2/promise';
import { generateId } from '../utils';

const router = Router();
const adminAndSales = [UserAccessLevel.ADMIN, UserAccessLevel.SALES];

// --- Suppliers ---

router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM suppliers ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

router.post('/', isAuthenticated, hasRole(adminAndSales), async (req, res, next) => {
    const supplier: Supplier = { id: generateId(), ...req.body };
    try {
        await pool.query('INSERT INTO suppliers SET ?', [supplier]);
        res.status(201).json(supplier);
    } catch (error) {
        next(error);
    }
});

router.put('/:id', isAuthenticated, hasRole(adminAndSales), async (req, res, next) => {
    const { id } = req.params;
    const supplier: Supplier = req.body;
    try {
        await pool.query('UPDATE suppliers SET ? WHERE id = ?', [supplier, id]);
        res.json(supplier);
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', isAuthenticated, hasRole(adminAndSales), async (req, res, next) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM suppliers WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});


// --- Debts ---

router.get('/debts', isAuthenticated, async (req, res, next) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM supplier_debts ORDER BY dateAdded DESC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

router.post('/debts', isAuthenticated, hasRole(adminAndSales), async (req, res, next) => {
    const debt: Debt = { id: generateId(), ...req.body };
    try {
        await pool.query('INSERT INTO supplier_debts SET ?', [debt]);
        res.status(201).json(debt);
    } catch (error) {
        next(error);
    }
});

router.delete('/debts/:id', isAuthenticated, hasRole(adminAndSales), async (req, res, next) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM supplier_debts WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// --- Supplier Credits (Payments) ---

router.get('/supplier-credits', isAuthenticated, async (req, res, next) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM supplier_credits ORDER BY date DESC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

router.post('/supplier-credits', isAuthenticated, hasRole(adminAndSales), async (req, res, next) => {
    const credit: SupplierCredit = { id: generateId(), ...req.body };
    try {
        await pool.query('INSERT INTO supplier_credits SET ?', [credit]);
        res.status(201).json(credit);
    } catch (error) {
        next(error);
    }
});

router.delete('/supplier-credits/:id', isAuthenticated, hasRole(adminAndSales), async (req, res, next) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM supplier_credits WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;