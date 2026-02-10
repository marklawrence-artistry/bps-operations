const logAudit = require('../utils/audit-logger');
const { all, get, run } = require('../utils/db-async');
const { getIO } = require('../utils/socket');

// Update getAllRTS logic:
// Search by Tracking Number, Customer Name, or Product Name
const getAllRTS = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = `
            SELECT rts.*, seller.name as seller_name 
            FROM rts 
            LEFT JOIN seller ON rts.seller_id = seller.id
            WHERE 1=1
        `;
        let countQuery = `
            SELECT COUNT(*) as count FROM rts 
            LEFT JOIN seller ON rts.seller_id = seller.id
            WHERE 1=1
        `;
        let params = [];

        if(search) {
            const searchSQL = ` AND (rts.tracking_no LIKE ? OR rts.customer_name LIKE ? OR rts.product_name LIKE ?)`;
            query += searchSQL;
            countQuery += searchSQL;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if(req.query.status) {
            query += ` AND rts.status = ?`;
            countQuery += ` AND rts.status = ?`;
            params.push(req.query.status);
        }

        const sort = req.query.sort === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY rts.created_at ${sort} LIMIT ? OFFSET ?`;
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
};

const getRTS = async (req, res) => {
    try {
        const { id } = req.params;
        const row = await get(`SELECT * FROM rts WHERE id = ?`, [id]);
        
        if (!row) return res.status(404).json({ success: false, data: "Record not found." });
        
        res.status(200).json({ success: true, data: row });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const createRTS = async (req, res) => {
    try {
        const { seller_id, customer_name, tracking_no, product_name, description, staff_id } = req.body;

        if (!seller_id || !tracking_no) {
            return res.status(400).json({ success: false, data: "Seller and Tracking No are required." });
        }

        const result = await run(`
            INSERT INTO rts (seller_id, customer_name, tracking_no, product_name, description, status, staff_id)
            VALUES (?, ?, ?, ?, ?, 'pending', ?)
        `, [seller_id, customer_name, tracking_no, product_name, description, staff_id || req.user.id]);

        await logAudit(req.user.id, 'CREATE', 'rts', result.lastID, `Created RTS log for ${tracking_no}`, req.ip);
        getIO().emit('rts_update');
        res.status(201).json({ success: true, data: "Item logged.", id: result.lastID });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const updateRTS = async (req, res) => {
    try {
        const { id } = req.params;
        const { seller_id, customer_name, tracking_no, product_name, description, status, staff_id } = req.body;

        await run(`
            UPDATE rts
            SET 
                seller_id = COALESCE(?, seller_id),
                customer_name = COALESCE(?, customer_name),
                tracking_no = COALESCE(?, tracking_no),
                product_name = COALESCE(?, product_name),
                description = COALESCE(?, description),
                status = COALESCE(?, status),
                staff_id = COALESCE(?, staff_id)
            WHERE id = ?
        `, [seller_id, customer_name, tracking_no, product_name, description, status, staff_id, id]);

        await logAudit(req.user.id, 'UPDATE', 'rts', id, `Updated RTS log ID: ${id}`, req.ip);
        getIO().emit('rts_update');
        res.status(200).json({ success: true, data: "RTS Record updated." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const deleteRTS = async (req, res) => {
    try {
        const { id } = req.params;
        await run(`DELETE FROM rts WHERE id = ?`, [id]);
        await logAudit(req.user.id, 'DELETE', 'rts', id, `Deleted RTS log ID: ${id}`, req.ip);
        getIO().emit('rts_update');
        res.status(200).json({ success: true, data: "RTS Record deleted." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

module.exports = { getAllRTS, getRTS, createRTS, updateRTS, deleteRTS };