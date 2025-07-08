import asyncHandler from 'express-async-handler';
import db from '../config/db.js';

// @desc    Get dashboard stats (counts, company name)
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = asyncHandler(async (req, res) => {
    const [[productCount]] = await db.execute('SELECT COUNT(*) as count FROM products');
    const [[quoteCount]] = await db.execute('SELECT COUNT(*) as count FROM quotes');
    const [[companyInfo]] = await db.execute('SELECT name FROM company_info WHERE id = 1');

    res.json({
        productCount: productCount.count,
        quoteCount: quoteCount.count,
        companyName: companyInfo ? companyInfo.name : 'Sua Empresa'
    });
});

// @desc    Get sales data for chart by year
// @route   GET /api/dashboard/sales-chart
// @access  Private
const getSalesChartData = asyncHandler(async (req, res) => {
    const selectedYear = parseInt(req.query.year, 10) || new Date().getFullYear();

    const [sales] = await db.execute(
        'SELECT MONTH(createdAt) as month, SUM(totalCash) as total FROM quotes WHERE (status = "accepted" OR status = "converted_to_order") AND YEAR(createdAt) = ? GROUP BY MONTH(createdAt)',
        [selectedYear]
    );

    const [yearsWithSales] = await db.execute(
        'SELECT DISTINCT YEAR(createdAt) as year FROM quotes WHERE status = "accepted" OR status = "converted_to_order" ORDER BY year DESC'
    );
    
    const availableYears = [...new Set([...yearsWithSales.map(y => y.year), new Date().getFullYear()])].sort((a,b) => b-a);
    
    const monthlySales = Array(12).fill(0);
    sales.forEach(sale => {
        monthlySales[sale.month - 1] = sale.total;
    });

    res.json({
        monthlySales,
        availableYears
    });
});

// @desc    Get recent draft quotes
// @route   GET /api/dashboard/draft-quotes
// @access  Private
const getDraftQuotes = asyncHandler(async (req, res) => {
    const [quotes] = await db.execute(
        'SELECT * FROM quotes WHERE status = "draft" ORDER BY createdAt DESC LIMIT 5'
    );
    res.json(quotes);
});

// @desc    Get recent accepted quotes for the current month
// @route   GET /api/dashboard/recent-accepted-quotes
// @access  Private
const getRecentAcceptedQuotes = asyncHandler(async (req, res) => {
    const [quotes] = await db.execute(
        'SELECT * FROM quotes WHERE (status = "accepted" OR status = "converted_to_order") AND MONTH(createdAt) = MONTH(CURRENT_DATE()) AND YEAR(createdAt) = YEAR(CURRENT_DATE()) ORDER BY createdAt DESC LIMIT 10'
    );
    res.json(quotes);
});

export {
    getDashboardStats,
    getSalesChartData,
    getDraftQuotes,
    getRecentAcceptedQuotes
};
