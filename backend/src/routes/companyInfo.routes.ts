
import { Router } from 'express';
import pool from '../db';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { CompanyInfo, UserAccessLevel } from '../types';
import { RowDataPacket } from 'mysql2';
import { generateId } from '../utils';

const router = Router();

// GET /api/company-info
router.get('/', async (req, res, next) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM company_info LIMIT 1');
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Company information not found.' });
        }
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// POST /api/company-info (Create or Update)
router.post('/', isAuthenticated, hasRole(UserAccessLevel.ADMIN), async (req, res, next) => {
    const companyData: CompanyInfo = req.body;
    
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM company_info LIMIT 1');
        
        if (rows.length > 0) {
            // Update existing record
            const existingId = rows[0].id;
            await pool.query('UPDATE company_info SET ? WHERE id = ?', [companyData, existingId]);
            res.json({ ...companyData, id: existingId });
        } else {
            // Insert new record
            const newId = companyData.id || generateId();
            const dataToInsert = { ...companyData, id: newId };
            await pool.query('INSERT INTO company_info SET ?', dataToInsert);
            res.status(201).json(dataToInsert);
        }
    } catch (error) {
        next(error);
    }
});

export default router;