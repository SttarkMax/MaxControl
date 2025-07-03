
import { Router } from 'express';
import pool from '../db';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { Customer, DownPaymentEntry, UserAccessLevel } from '../types';
import { RowDataPacket } from 'mysql2/promise';
import { generateId } from '../utils';

const router = Router();
const requiredRoles = [UserAccessLevel.ADMIN, UserAccessLevel.SALES];

// GET /api/customers
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        const [customers] = await pool.query<RowDataPacket[]>('SELECT * FROM customers ORDER BY name ASC');
        const [downPayments] = await pool.query<RowDataPacket[]>('SELECT * FROM down_payment_entries');

        const customersWithPayments = customers.map(customer => {
            return {
                ...customer,
                downPayments: downPayments.filter(dp => dp.customerId === customer.id)
            };
        });

        res.json(customersWithPayments);
    } catch (error) {
        next(error);
    }
});

// Shared function to save a customer (create or update)
const saveCustomer = async (customer: Customer) => {
    const { downPayments, ...customerData } = customer;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        if (customerData.id) {
            await conn.query('UPDATE customers SET ? WHERE id = ?', [customerData, customerData.id]);
            // Clear old down payments for this customer and insert new ones
            await conn.query('DELETE FROM down_payment_entries WHERE customerId = ?', [customerData.id]);
        } else {
            customerData.id = generateId();
            await conn.query('INSERT INTO customers SET ?', [customerData]);
        }
        
        if (downPayments && downPayments.length > 0) {
            for (const payment of downPayments) {
                const paymentEntry: Omit<DownPaymentEntry, 'id'> & { id: string } = {
                    id: generateId(),
                    customerId: customerData.id,
                    amount: payment.amount,
                    date: payment.date,
                    description: payment.description,
                };
                await conn.query('INSERT INTO down_payment_entries SET ?', [paymentEntry]);
            }
        }
        
        await conn.commit();
        return { ...customerData, downPayments: downPayments || [] };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// POST /api/customers
router.post('/', isAuthenticated, hasRole(requiredRoles), async (req, res, next) => {
    const customerData: Customer = { id: '', ...req.body }; // Ensure ID is empty for creation
    try {
        const newCustomer = await saveCustomer(customerData);
        res.status(201).json(newCustomer);
    } catch (error) {
        next(error);
    }
});

// PUT /api/customers/:id
router.put('/:id', isAuthenticated, hasRole(requiredRoles), async (req, res, next) => {
    const { id } = req.params;
    const customerData: Customer = { ...req.body, id };
    try {
        const updatedCustomer = await saveCustomer(customerData);
        res.json(updatedCustomer);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/customers/:id
router.delete('/:id', isAuthenticated, hasRole(requiredRoles), async (req, res, next) => {
    const { id } = req.params;
    try {
        // The database schema uses ON DELETE CASCADE for down_payment_entries and quotes
        await pool.query('DELETE FROM customers WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;