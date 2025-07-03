
import { Router } from 'express';
import pool from '../db';
import { isAuthenticated, hasRole } from '../middleware/auth';
import { Quote, QuoteItem, CompanyInfo, LoggedInUser, UserAccessLevel } from '../types';
import { RowDataPacket } from 'mysql2/promise';
import { generateId } from '../utils';

const router = Router();
const requiredRoles = [UserAccessLevel.ADMIN, UserAccessLevel.SALES];

// GET /api/quotes
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        const [quotes] = await pool.query<RowDataPacket[]>('SELECT * FROM quotes ORDER BY createdAt DESC');
        const quoteIds = quotes.map(q => q.id);

        if (quoteIds.length === 0) {
            return res.json([]);
        }

        const [items] = await pool.query<RowDataPacket[]>('SELECT * FROM quote_items WHERE quoteId IN (?)', [quoteIds]);

        const quotesWithItems = quotes.map(quote => ({
            ...quote,
            items: items.filter(item => item.quoteId === quote.id)
        }));

        res.json(quotesWithItems);
    } catch (error) {
        next(error);
    }
});

// GET /api/quotes/:id
router.get('/:id', isAuthenticated, async (req, res, next) => {
    const { id } = req.params;
    try {
        const [quotes] = await pool.query<RowDataPacket[]>('SELECT * FROM quotes WHERE id = ?', [id]);
        if (quotes.length === 0) {
            return res.status(404).json({ message: 'Quote not found.' });
        }
        const [items] = await pool.query<RowDataPacket[]>('SELECT * FROM quote_items WHERE quoteId = ?', [id]);
        res.json({ ...quotes[0], items });
    } catch (error) {
        next(error);
    }
});

// Helper function to save a quote
const saveQuote = async (quoteData: Partial<Quote>, user: LoggedInUser) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { items, ...mainQuoteData } = quoteData;

        if (quoteData.id) { // Update
            // Remove old items
            await conn.query('DELETE FROM quote_items WHERE quoteId = ?', [quoteData.id]);
            await conn.query('UPDATE quotes SET ? WHERE id = ?', [mainQuoteData, quoteData.id]);
        } else { // Create
            const newId = generateId();
            mainQuoteData.id = newId;
            
            // Get latest quote number and increment
            const [lastQuote] = await conn.query<RowDataPacket[]>("SELECT quoteNumber FROM quotes ORDER BY CAST(quoteNumber AS UNSIGNED) DESC, quoteNumber DESC LIMIT 1");
            const nextNumber = lastQuote.length > 0 ? parseInt(lastQuote[0].quoteNumber, 10) + 1 : 1;
            mainQuoteData.quoteNumber = nextNumber.toString().padStart(4, '0');

            // Get company info snapshot
            const [companyRows] = await conn.query<RowDataPacket[]>('SELECT * FROM company_info LIMIT 1');
            if (companyRows.length === 0) {
                throw new Error("Company information has not been set up. Cannot create a quote snapshot.");
            }
            mainQuoteData.companyInfoSnapshot = companyRows[0] as CompanyInfo;

            mainQuoteData.salespersonUsername = user.username;
            mainQuoteData.salespersonFullName = user.fullName;

            await conn.query('INSERT INTO quotes SET ?', [mainQuoteData]);
        }

        // Insert new items
        if (items && items.length > 0) {
            for (const item of items) {
                const { ...itemData } = item;
                await conn.query('INSERT INTO quote_items SET ?', { ...itemData, quoteId: mainQuoteData.id });
            }
        }
        
        await conn.commit();
        
        // Fetch the full quote to return
        const [newQuotes] = await conn.query<RowDataPacket[]>('SELECT * FROM quotes WHERE id = ?', [mainQuoteData.id]);
        const [newItems] = await conn.query<RowDataPacket[]>('SELECT * FROM quote_items WHERE quoteId = ?', [mainQuoteData.id]);
        return { ...newQuotes[0], items: newItems };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// POST /api/quotes
router.post('/', isAuthenticated, hasRole(requiredRoles), async (req, res, next) => {
    try {
        const user = req.session.user!;
        const newQuote = await saveQuote(req.body, user);
        res.status(201).json(newQuote);
    } catch (error) {
        next(error);
    }
});

// PUT /api/quotes/:id
router.put('/:id', isAuthenticated, hasRole(requiredRoles), async (req, res, next) => {
    const { id } = req.params;
    const quoteData = { ...req.body, id };
    try {
        const user = req.session.user!;
        const updatedQuote = await saveQuote(quoteData, user);
        res.json(updatedQuote);
    } catch (error) {
        next(error);
    }
});

export default router;