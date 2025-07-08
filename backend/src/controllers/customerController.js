import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

// @desc    Fetch all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = asyncHandler(async (req, res) => {
    const [customers] = await db.execute('SELECT * FROM customers ORDER BY name ASC');
    const [downPayments] = await db.execute('SELECT * FROM down_payments');

    const customersWithPayments = customers.map(customer => {
        return {
            ...customer,
            downPayments: downPayments.filter(dp => dp.customerId === customer.id)
        }
    });

    res.json(customersWithPayments);
});

// @desc    Fetch single customer
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = asyncHandler(async (req, res) => {
    const [customers] = await db.execute('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    
    if (customers.length > 0) {
        const customer = customers[0];
        const [downPayments] = await db.execute('SELECT * FROM down_payments WHERE customerId = ?', [customer.id]);
        customer.downPayments = downPayments;
        res.json(customer);
    } else {
        res.status(404);
        throw new Error('Customer not found');
    }
});

// @desc    Create a customer
// @route   POST /api/customers
// @access  Private
const createCustomer = asyncHandler(async (req, res) => {
    const { name, documentType, documentNumber, phone, email, address, city, postalCode } = req.body;
    const id = uuidv4();
    
    const sql = `
        INSERT INTO customers (id, name, documentType, documentNumber, phone, email, address, city, postalCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.execute(sql, [id, name, documentType, documentNumber || null, phone, email || null, address || null, city || null, postalCode || null]);
    
    const [newCustomer] = await db.execute('SELECT * FROM customers WHERE id = ?', [id]);
    newCustomer[0].downPayments = []; // New customer has no payments
    res.status(201).json(newCustomer[0]);
});

// @desc    Update a customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = asyncHandler(async (req, res) => {
    const { name, documentType, documentNumber, phone, email, address, city, postalCode, downPayments } = req.body;
    const customerId = req.params.id;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const sql = `
            UPDATE customers
            SET name = ?, documentType = ?, documentNumber = ?, phone = ?, email = ?, address = ?, city = ?, postalCode = ?
            WHERE id = ?
        `;
        await connection.execute(sql, [name, documentType, documentNumber, phone, email, address, city, postalCode, customerId]);

        // Sync down payments
        await connection.execute('DELETE FROM down_payments WHERE customerId = ?', [customerId]);
        if (downPayments && downPayments.length > 0) {
            const paymentValues = downPayments.map(dp => [dp.id, customerId, dp.amount, dp.date, dp.description]);
            await connection.query('INSERT INTO down_payments (id, customerId, amount, date, description) VALUES ?', [paymentValues]);
        }
        
        await connection.commit();
        
        const [updatedCustomerData] = await connection.execute('SELECT * FROM customers WHERE id = ?', [customerId]);
        const [updatedDownPayments] = await connection.execute('SELECT * FROM down_payments WHERE customerId = ?', [customerId]);

        const response = {
            ...updatedCustomerData[0],
            downPayments: updatedDownPayments
        }

        res.json(response);

    } catch (error) {
        await connection.rollback();
        throw new Error(`Failed to update customer: ${error.message}`);
    } finally {
        connection.release();
    }
});

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = asyncHandler(async (req, res) => {
    const customerId = req.params.id;

    // First check if customer exists
    const [customers] = await db.execute('SELECT id FROM customers WHERE id = ?', [customerId]);
    if (customers.length === 0) {
        res.status(404);
        throw new Error('Customer not found');
    }
    
    // Set customerId to NULL in quotes table
    await db.execute('UPDATE quotes SET customerId = NULL WHERE customerId = ?', [customerId]);

    // Delete the customer. Down payments will be deleted by CASCADE.
    await db.execute('DELETE FROM customers WHERE id = ?', [customerId]);

    res.json({ message: 'Customer removed and quotes unlinked' });
});

export {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};
