import asyncHandler from 'express-async-handler';
import db from '../config/db.js';

// @desc    Get company info
// @route   GET /api/settings/company-info
// @access  Private
const getCompanyInfo = asyncHandler(async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM company_info WHERE id = 1');
    if (rows.length > 0) {
        res.json(rows[0]);
    } else {
        // This case should ideally not happen if the DB is seeded correctly
        res.status(404);
        throw new Error('Company information not found. Please configure it.');
    }
});

// @desc    Update company info
// @route   PUT /api/settings/company-info
// @access  Private/Admin
const updateCompanyInfo = asyncHandler(async (req, res) => {
    const { 
        name, logoUrlDarkBg, logoUrlLightBg, address, phone, email, cnpj, instagram, website 
    } = req.body;

    const sql = `
        UPDATE company_info SET 
        name = ?, logoUrlDarkBg = ?, logoUrlLightBg = ?, address = ?, phone = ?, email = ?, 
        cnpj = ?, instagram = ?, website = ?
        WHERE id = 1
    `;
    
    await db.execute(sql, [
        name, logoUrlDarkBg, logoUrlLightBg, address, phone, email, cnpj, instagram, website
    ]);

    const [updatedInfo] = await db.execute('SELECT * FROM company_info WHERE id = 1');
    res.json(updatedInfo[0]);
});


export { getCompanyInfo, updateCompanyInfo };
