const logAudit = require('../utils/audit-logger');
const { all, get, run } = require('../utils/db-async');
const { getIO } = require('../utils/socket');

const getAllSales = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = `SELECT * FROM weekly_sales WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) as count FROM weekly_sales WHERE 1=1`;
        let params = [];

        if(search) {
            const searchSQL = ` AND (notes LIKE ? OR CAST(total_amount AS TEXT) LIKE ?)`;
            query += searchSQL;
            countQuery += searchSQL;
            params.push(`%${search}%`, `%${search}%`);
        }

        // Sort Logic
        const sort = req.query.sort;
        if (sort === 'oldest') query += ` ORDER BY week_start_date ASC`;
        else if (sort === 'amount_high') query += ` ORDER BY total_amount DESC`;
        else if (sort === 'amount_low') query += ` ORDER BY total_amount ASC`;
        else query += ` ORDER BY week_start_date DESC`; // Default 'newest'

        query += ` LIMIT ? OFFSET ?`;
        const queryParams = [...params, limit, offset];

        const rows = await all(query, queryParams);
        const countResult = await get(countQuery, params);
        const totalItems = countResult.count;
        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            success: true, data: rows,
            pagination: { current: page, limit, totalItems, totalPages }
        });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
}

const createSale = async (req, res) => {
    try {
        const { week_start_date, week_end_date, total_amount, notes } = req.body;

        if (!week_start_date || !week_end_date || !total_amount) {
            return res.status(400).json({ success: false, data: "Dates and Amount are required." });
        }

        const result = await run(`
            INSERT INTO weekly_sales (week_start_date, week_end_date, total_amount, notes)
            VALUES (?, ?, ?, ?)
        `, [week_start_date, week_end_date, total_amount, notes]);

        await logAudit(req.user.id, 'CREATE', 'weekly_sales', result.lastID, `Added sales record for week ${week_start_date}`, req.ip);

        getIO().emit('sales_update');
        res.status(201).json({ success: true, data: "Sales record added.", id: result.lastID });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const updateSale = async (req, res) => {
    try {
        const { id } = req.params;
        const { week_start_date, week_end_date, total_amount, notes } = req.body;

        await run(`
            UPDATE weekly_sales
            SET 
                week_start_date = COALESCE(?, week_start_date),
                week_end_date = COALESCE(?, week_end_date),
                total_amount = COALESCE(?, total_amount),
                notes = COALESCE(?, notes)
            WHERE id = ?
        `, [week_start_date, week_end_date, total_amount, notes, id]);

        await logAudit(req.user.id, 'UPDATE', 'weekly_sales', id, `Updated sales record ID: ${id}`, req.ip);
        getIO().emit('sales_update');
        res.status(200).json({ success: true, data: "Sales record updated." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const deleteSale = async (req, res) => {
    try {
        const { id } = req.params;
        await run(`DELETE FROM weekly_sales WHERE id = ?`, [id]);
        await logAudit(req.user.id, 'DELETE', 'weekly_sales', id, `Deleted sales record ID: ${id}`, req.ip);
        getIO().emit('sales_update');
        res.status(200).json({ success: true, data: "Sales record deleted." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

module.exports = { getAllSales, createSale, updateSale, deleteSale };