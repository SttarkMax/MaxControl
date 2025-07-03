
import { Router } from 'express';
import pool from '../db';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { User, UserAccessLevel } from '../types';
import { RowDataPacket } from 'mysql2';
import { generateId, hashPassword } from '../utils';

const router = Router();

// GET /api/users
router.get('/', isAuthenticated, hasRole(UserAccessLevel.ADMIN), async (req, res, next) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT id, username, fullName, role FROM users ORDER BY fullName ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/users
router.post('/', isAuthenticated, hasRole(UserAccessLevel.ADMIN), async (req, res, next) => {
    const { username, fullName, password, role } = req.body;
    if (!password) {
        return res.status(400).json({ message: 'Password is required for new users.' });
    }
    try {
        const hashedPassword = await hashPassword(password);
        const newUser: Omit<User, 'password'> & { password?: string } = {
            id: generateId(),
            username,
            fullName,
            password: hashedPassword,
            role,
        };
        await pool.query('INSERT INTO users SET ?', [newUser]);
        delete newUser.password; // Don't return password
        res.status(201).json(newUser);
    } catch (error) {
        if ((error as any).code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username already exists.' });
        }
        next(error);
    }
});

// PUT /api/users/:id
router.put('/:id', isAuthenticated, hasRole(UserAccessLevel.ADMIN), async (req, res, next) => {
    const { id } = req.params;
    const { fullName, password, role } = req.body;
    
    try {
        const updates: any = { fullName, role };
        if (password) {
            updates.password = await hashPassword(password);
        }

        await pool.query('UPDATE users SET ? WHERE id = ?', [updates, id]);
        
        const [updatedUserRows] = await pool.query<RowDataPacket[]>('SELECT id, username, fullName, role FROM users WHERE id = ?', [id]);
        res.json(updatedUserRows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/users/:id
router.delete('/:id', isAuthenticated, hasRole(UserAccessLevel.ADMIN), async (req, res, next) => {
    const { id } = req.params;
    if (id === req.session.user?.id) {
        return res.status(400).json({ message: 'You cannot delete yourself.' });
    }
    try {
        // Prevent deleting the last admin
        const [admins] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE role = ?', [UserAccessLevel.ADMIN]);
        if (admins.length === 1 && admins[0].id === id) {
             return res.status(400).json({ message: 'Cannot delete the last administrator.' });
        }
        
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;