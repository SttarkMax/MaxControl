import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

// SUPPLIERS
const getSuppliers = asyncHandler(async (req, res) => {
    const [suppliers] = await db.execute('SELECT * FROM suppliers ORDER BY name ASC');
    res.json(suppliers);
});

const createSupplier = asyncHandler(async (req, res) => {
    const { name, cnpj, phone, email, address, notes } = req.body;
    const id = `sup_${uuidv4()}`;
    await db.execute(
        'INSERT INTO suppliers (id, name, cnpj, phone, email, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name, cnpj, phone, email, address, notes]
    );
    const [newSupplier] = await db.execute('SELECT * FROM suppliers WHERE id = ?', [id]);
    res.status(201).json(newSupplier[0]);
});

const updateSupplier = asyncHandler(async (req, res) => {
    const { name, cnpj, phone, email, address, notes } = req.body;
    await db.execute(
        'UPDATE suppliers SET name = ?, cnpj = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?',
        [name, cnpj, phone, email, address, notes, req.params.id]
    );
    const [updatedSupplier] = await db.execute('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    res.json(updatedSupplier[0]);
});

const deleteSupplier = asyncHandler(async (req, res) => {
    // ON DELETE CASCADE will handle associated debts and credits
    await db.execute('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Supplier and all associated records removed' });
});


// DEBTS & CREDITS
const getSupplierDebts = asyncHandler(async (req, res) => {
    const [debts] = await db.execute('SELECT * FROM supplier_debts WHERE supplierId = ? ORDER BY dateAdded DESC', [req.params.id]);
    res.json(debts);
});

const addDebtToSupplier = asyncHandler(async (req, res) => {
    const { description, totalAmount, dateAdded } = req.body;
    const id = `d_${uuidv4()}`;
    await db.execute(
        'INSERT INTO supplier_debts (id, supplierId, description, totalAmount, dateAdded) VALUES (?, ?, ?, ?, ?)',
        [id, req.params.id, description, totalAmount, dateAdded]
    );
    const [newDebt] = await db.execute('SELECT * FROM supplier_debts WHERE id = ?', [id]);
    res.status(201).json(newDebt[0]);
});

const getSupplierCredits = asyncHandler(async (req, res) => {
    const [credits] = await db.execute('SELECT * FROM supplier_credits WHERE supplierId = ? ORDER BY date DESC', [req.params.id]);
    res.json(credits);
});

const addCreditToSupplier = asyncHandler(async (req, res) => {
    const { amount, date, description } = req.body;
    const id = `cred_${uuidv4()}`;
    await db.execute(
        'INSERT INTO supplier_credits (id, supplierId, amount, date, description) VALUES (?, ?, ?, ?, ?)',
        [id, req.params.id, amount, date, description]
    );
    const [newCredit] = await db.execute('SELECT * FROM supplier_credits WHERE id = ?', [id]);
    res.status(201).json(newCredit[0]);
});

const deleteTransaction = asyncHandler(async (req, res) => {
    const { type, transactionId } = req.params;
    const table = type === 'debt' ? 'supplier_debts' : 'supplier_credits';
    const [result] = await db.execute(`DELETE FROM ${table} WHERE id = ?`, [transactionId]);
    if (result.affectedRows > 0) {
        res.json({ message: 'Transaction removed' });
    } else {
        res.status(404).json({ message: 'Transaction not found' });
    }
});

// GET ALL for initial page load
const getAllDebts = asyncHandler(async (req, res) => {
    const [debts] = await db.execute('SELECT * FROM supplier_debts');
    res.json(debts);
});
const getAllCredits = asyncHandler(async (req, res) => {
    const [credits] = await db.execute('SELECT * FROM supplier_credits');
    res.json(credits);
});


export {
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
    getAllCredits
};
