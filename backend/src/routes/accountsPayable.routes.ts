
import { Router } from 'express';
import pool from '../db';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { AccountsPayableEntry, UserAccessLevel } from '../types';
import { RowDataPacket } from 'mysql2/promise';
import { generateId, addMonths, addWeeks, formatDateForDb } from '../utils';

const router = Router();

// GET /api/accounts-payable
router.get('/', isAuthenticated, hasRole(UserAccessLevel.ADMIN), async (req, res, next) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM accounts_payable_entries ORDER BY dueDate ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/accounts-payable
router.post('/', isAuthenticated, hasRole(UserAccessLevel.ADMIN), async (req, res, next) => {
    const entry: Omit<AccountsPayableEntry, 'id' | 'createdAt'> = req.body;
    const newEntry: AccountsPayableEntry = {
        ...entry,
        id: generateId(),
        createdAt: new Date().toISOString()
    };
    try {
        await pool.query('INSERT INTO accounts_payable_entries SET ?', [newEntry]);
        res.status(201).json(newEntry);
    } catch (error) {
        next(error);
    }
});

// POST /api/accounts-payable/series
router.post('/series', isAuthenticated, hasRole(UserAccessLevel.ADMIN), async (req, res, next) => {
    const { baseEntry, installments, frequency } = req.body;
    const seriesId = generateId();
    const installmentAmount = baseEntry.amount / installments;
    const startDate = new Date(baseEntry.dueDate);
    const createdEntries = [];

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        for (let i = 0; i < installments; i++) {
            let dueDate: Date;
            if (frequency === 'monthly') {
                dueDate = addMonths(startDate, i);
            } else { // weekly
                dueDate = addWeeks(startDate, i);
            }

            const entry: AccountsPayableEntry = {
                id: generateId(),
                name: `${baseEntry.name} (${i + 1}/${installments})`,
                amount: installmentAmount,
                dueDate: formatDateForDb(dueDate),
                isPaid: baseEntry.isPaid,
                createdAt: new Date().toISOString(),
                notes: baseEntry.notes,
                seriesId: seriesId,
                totalInstallmentsInSeries: installments,
                installmentNumberOfSeries: i + 1,
            };
            await conn.query('INSERT INTO accounts_payable_entries SET ?', [entry]);
            createdEntries.push(entry);
        }
        await conn.commit();
        res.status(201).json(createdEntries);
    } catch (error) {
        await conn.rollback();
        next(error);
    } finally {
        conn.release();
    }
});

// PUT /api/accounts-payable/:id
router.put('/:id', isAuthenticated, hasRole(UserAccessLevel.ADMIN), async (req, res, next) => {
    const { id } = req.params;
    const entry: AccountsPayableEntry = req.body;
    try {
        await pool.query('UPDATE accounts_payable_entries SET ? WHERE id = ?', [entry, id]);
        res.json(entry);
    } catch (error) {
        next(error);
    }
});

// POST /api/accounts-payable/:id/toggle-paid
router.post('/:id/toggle-paid', isAuthenticated, hasRole(UserAccessLevel.ADMIN), async (req, res, next) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE accounts_payable_entries SET isPaid = NOT isPaid WHERE id = ?', [id]);
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM accounts_payable_entries WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/accounts-payable/:id
router.delete('/:id', isAuthenticated, hasRole(UserAccessLevel.ADMIN), async (req, res, next) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM accounts_payable_entries WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// DELETE /api/accounts-payable/series/:seriesId
router.delete('/series/:seriesId', isAuthenticated, hasRole(UserAccessLevel.ADMIN), async (req, res, next) => {
    const { seriesId } = req.params;
    try {
        await pool.query('DELETE FROM accounts_payable_entries WHERE seriesId = ?', [seriesId]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;