import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

// Helper to add weeks to a date
const addWeeks = (date, weeks) => {
    const result = new Date(date);
    result.setDate(result.getDate() + weeks * 7);
    return result;
};
// Helper to add months to a date
const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
};

// @desc    Get all accounts payable entries
// @route   GET /api/accounts-payable
// @access  Private/Admin
const getEntries = asyncHandler(async (req, res) => {
    const [entries] = await db.execute('SELECT * FROM accounts_payable ORDER BY dueDate ASC');
    res.json(entries);
});

// @desc    Create a new entry or series of entries
// @route   POST /api/accounts-payable
// @access  Private/Admin
const createEntry = asyncHandler(async (req, res) => {
    const { name, totalAmount, dueDate, isPaid, parcelType, numberOfInstallments, notes } = req.body;
    
    const newEntries = [];
    const now = new Date();
    const seriesId = `series_${uuidv4()}`;

    if (parcelType === 'none' || !numberOfInstallments || numberOfInstallments <= 1) {
        const id = `entry_${uuidv4()}`;
        newEntries.push({ id, name, amount: totalAmount, dueDate, isPaid, notes, createdAt: now });
    } else {
        const installmentAmount = parseFloat((totalAmount / numberOfInstallments).toFixed(2));
        let firstDueDate = new Date(dueDate + 'T00:00:00');

        for (let i = 0; i < numberOfInstallments; i++) {
            const id = `entry_${uuidv4()}_${i}`;
            let currentDueDate = i === 0 ? firstDueDate : (parcelType === 'weekly' ? addWeeks(firstDueDate, i) : addMonths(firstDueDate, i));

            // Adjust last installment for rounding differences
            const amount = (i === numberOfInstallments - 1) 
                ? parseFloat((totalAmount - (installmentAmount * (numberOfInstallments - 1))).toFixed(2))
                : installmentAmount;

            newEntries.push({
                id,
                name: `${name} - ${i + 1}/${numberOfInstallments}`,
                amount,
                dueDate: currentDueDate.toISOString().split('T')[0],
                isPaid: false,
                seriesId,
                totalInstallmentsInSeries: numberOfInstallments,
                installmentNumberOfSeries: i + 1,
                notes: i === 0 ? notes : null,
                createdAt: now
            });
        }
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const sql = `INSERT INTO accounts_payable (id, name, amount, dueDate, isPaid, notes, seriesId, totalInstallmentsInSeries, installmentNumberOfSeries, createdAt) VALUES ?`;
        const values = newEntries.map(e => [e.id, e.name, e.amount, e.dueDate, e.isPaid, e.notes, e.seriesId, e.totalInstallmentsInSeries, e.installmentNumberOfSeries, e.createdAt]);
        await connection.query(sql, [values]);
        await connection.commit();
        res.status(201).json(newEntries);
    } catch (error) {
        await connection.rollback();
        throw new Error(`Failed to create entries: ${error.message}`);
    } finally {
        connection.release();
    }
});

// @desc    Update an entry
// @route   PUT /api/accounts-payable/:id
// @access  Private/Admin
const updateEntry = asyncHandler(async (req, res) => {
    const { name, amount, dueDate, isPaid, notes } = req.body;
    const sql = 'UPDATE accounts_payable SET name = ?, amount = ?, dueDate = ?, isPaid = ?, notes = ? WHERE id = ?';
    const [result] = await db.execute(sql, [name, amount, dueDate, isPaid, notes || null, req.params.id]);

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Entry not found');
    }
    const [updatedEntry] = await db.execute('SELECT * FROM accounts_payable WHERE id = ?', [req.params.id]);
    res.json(updatedEntry[0]);
});

// @desc    Delete an entry
// @route   DELETE /api/accounts-payable/:id
// @access  Private/Admin
const deleteEntry = asyncHandler(async (req, res) => {
    const [result] = await db.execute('DELETE FROM accounts_payable WHERE id = ?', [req.params.id]);
    if (result.affectedRows > 0) {
        res.json({ message: 'Entry removed' });
    } else {
        res.status(404);
        throw new Error('Entry not found');
    }
});

// @desc    Delete an entire series of entries
// @route   DELETE /api/accounts-payable/series/:seriesId
// @access  Private/Admin
const deleteEntrySeries = asyncHandler(async (req, res) => {
    const [result] = await db.execute('DELETE FROM accounts_payable WHERE seriesId = ?', [req.params.seriesId]);
    if (result.affectedRows > 0) {
        res.json({ message: `${result.affectedRows} entries in the series were removed` });
    } else {
        res.status(404);
        throw new Error('No entries found for this series');
    }
});


export { getEntries, createEntry, updateEntry, deleteEntry, deleteEntrySeries };
