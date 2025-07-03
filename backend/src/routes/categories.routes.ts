
import { Router } from 'express';
import pool from '../db';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { Category, UserAccessLevel } from '../types';
import { RowDataPacket } from 'mysql2';
import { generateId } from '../utils';

const router = Router();
const requiredRoles = [UserAccessLevel.ADMIN, UserAccessLevel.SALES];

// GET /api/categories
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM categories ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/categories
router.post('/', isAuthenticated, hasRole(requiredRoles), async (req, res, next) => {
    const category: Category = req.body;
    category.id = generateId();
    try {
        await pool.query('INSERT INTO categories SET ?', [category]);
        res.status(201).json(category);
    } catch (error) {
        next(error);
    }
});

// PUT /api/categories/:id
router.put('/:id', isAuthenticated, hasRole(requiredRoles), async (req, res, next) => {
    const { id } = req.params;
    const category: Category = req.body;
    try {
        await pool.query('UPDATE categories SET ? WHERE id = ?', [category, id]);
        res.json(category);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/categories/:id
router.delete('/:id', isAuthenticated, hasRole(requiredRoles), async (req, res, next) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM categories WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;