
import { Router } from 'express';
import pool from '../db';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { Product, UserAccessLevel } from '../types';
import { RowDataPacket } from 'mysql2';
import { generateId } from '../utils';

const router = Router();

const requiredRoles = [UserAccessLevel.ADMIN, UserAccessLevel.SALES];

// GET /api/products
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM products ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/products
router.post('/', isAuthenticated, hasRole(requiredRoles), async (req, res, next) => {
    const product: Product = req.body;
    product.id = generateId();
    try {
        await pool.query('INSERT INTO products SET ?', [product]);
        res.status(201).json(product);
    } catch (error) {
        next(error);
    }
});

// PUT /api/products/:id
router.put('/:id', isAuthenticated, hasRole(requiredRoles), async (req, res, next) => {
    const { id } = req.params;
    const product: Product = req.body;
    try {
        await pool.query('UPDATE products SET ? WHERE id = ?', [product, id]);
        res.json(product);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/products/:id
router.delete('/:id', isAuthenticated, hasRole(requiredRoles), async (req, res, next) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM products WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;