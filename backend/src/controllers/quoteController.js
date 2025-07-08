import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

// Helper to generate a unique quote number
const generateQuoteNumber = async () => {
    const prefix = 'ORC-';
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    
    const [rows] = await db.execute(
        `SELECT quoteNumber FROM quotes WHERE quoteNumber LIKE ? ORDER BY quoteNumber DESC LIMIT 1`,
        [`${prefix}${datePart}%`]
    );
    
    let nextSeq = 1;
    if (rows.length > 0) {
        const lastSeq = parseInt(rows[0].quoteNumber.split('-')[2], 10);
        nextSeq = lastSeq + 1;
    }
    
    return `${prefix}${datePart}-${String(nextSeq).padStart(3, '0')}`;
};


// @desc    Fetch all quotes
// @route   GET /api/quotes
// @access  Private
const getQuotes = asyncHandler(async (req, res) => {
    const { customerId } = req.query;
    let sql = 'SELECT * FROM quotes';
    const params = [];

    if (customerId) {
        sql += ' WHERE customerId = ?';
        params.push(customerId);
    }
    
    sql += ' ORDER BY createdAt DESC';

    const [quotes] = await db.execute(sql, params);
    res.json(quotes);
});

// @desc    Fetch single quote
// @route   GET /api/quotes/:id
// @access  Private
const getQuoteById = asyncHandler(async (req, res) => {
    const [quotes] = await db.execute('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (quotes.length > 0) {
        res.json(quotes[0]);
    } else {
        res.status(404);
        throw new Error('Quote not found');
    }
});

// @desc    Create a quote
// @route   POST /api/quotes
// @access  Private
const createQuote = asyncHandler(async (req, res) => {
    const {
        customerId, clientName, clientContact, items, subtotal, discountType, discountValue, discountAmountCalculated,
        subtotalAfterDiscount, totalCash, totalCard, downPaymentApplied, selectedPaymentMethod, paymentDate,
        deliveryDeadline, notes, status, salespersonUsername, salespersonFullName
    } = req.body;

    const [companyInfoRows] = await db.execute('SELECT * FROM company_info WHERE id = 1');
    if (companyInfoRows.length === 0) {
        res.status(500);
        throw new Error('Company information not configured');
    }

    const id = uuidv4();
    const quoteNumber = await generateQuoteNumber();
    const companyInfoSnapshot = JSON.stringify(companyInfoRows[0]);

    const sql = `
        INSERT INTO quotes (id, quoteNumber, customerId, clientName, clientContact, items, subtotal, discountType, discountValue, discountAmountCalculated, subtotalAfterDiscount, totalCash, totalCard, downPaymentApplied, selectedPaymentMethod, paymentDate, deliveryDeadline, notes, status, companyInfoSnapshot, salespersonUsername, salespersonFullName, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(sql, [
        id, quoteNumber, customerId, clientName, clientContact, JSON.stringify(items), subtotal, discountType, discountValue, discountAmountCalculated,
        subtotalAfterDiscount, totalCash, totalCard, downPaymentApplied, selectedPaymentMethod, paymentDate,
        deliveryDeadline, notes, status, companyInfoSnapshot, salespersonUsername, salespersonFullName, new Date()
    ]);

    const [newQuote] = await db.execute('SELECT * FROM quotes WHERE id = ?', [id]);
    res.status(201).json(newQuote[0]);
});

// @desc    Update a quote
// @route   PUT /api/quotes/:id
// @access  Private
const updateQuote = asyncHandler(async (req, res) => {
     const {
        customerId, clientName, clientContact, items, subtotal, discountType, discountValue, discountAmountCalculated,
        subtotalAfterDiscount, totalCash, totalCard, downPaymentApplied, selectedPaymentMethod, paymentDate,
        deliveryDeadline, notes, status
    } = req.body;

    const sql = `
        UPDATE quotes SET 
            customerId = ?, clientName = ?, clientContact = ?, items = ?, subtotal = ?, discountType = ?, 
            discountValue = ?, discountAmountCalculated = ?, subtotalAfterDiscount = ?, totalCash = ?, 
            totalCard = ?, downPaymentApplied = ?, selectedPaymentMethod = ?, paymentDate = ?, 
            deliveryDeadline = ?, notes = ?, status = ?
        WHERE id = ?
    `;

    const [result] = await db.execute(sql, [
        customerId, clientName, clientContact, JSON.stringify(items), subtotal, discountType, discountValue, discountAmountCalculated,
        subtotalAfterDiscount, totalCash, totalCard, downPaymentApplied, selectedPaymentMethod, paymentDate,
        deliveryDeadline, notes, status, req.params.id
    ]);

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Quote not found');
    }
    
    const [updatedQuote] = await db.execute('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    res.json(updatedQuote[0]);
});

// @desc    Delete a quote
// @route   DELETE /api/quotes/:id
// @access  Private
const deleteQuote = asyncHandler(async (req, res) => {
    const [result] = await db.execute('DELETE FROM quotes WHERE id = ?', [req.params.id]);

    if (result.affectedRows > 0) {
        res.json({ message: 'Quote removed' });
    } else {
        res.status(404);
        throw new Error('Quote not found');
    }
});

export {
    getQuotes,
    getQuoteById,
    createQuote,
    updateQuote,
    deleteQuote,
};
