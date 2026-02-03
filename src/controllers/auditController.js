const { all, get } = require('../utils/db-async');

const getAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        // Base query
        let query = `
            SELECT audit_logs.*, users.username 
            FROM audit_logs 
            LEFT JOIN users ON audit_logs.user_id = users.id 
        `;
        let countQuery = `
            SELECT COUNT(*) as count 
            FROM audit_logs 
            LEFT JOIN users ON audit_logs.user_id = users.id 
        `;
        let params = [];

        // Add Search
        if(search) {
            const searchSQL = ` WHERE users.username LIKE ? OR audit_logs.action_type LIKE ? OR audit_logs.description LIKE ?`;
            query += searchSQL;
            countQuery += searchSQL;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY audit_logs.created_at DESC LIMIT ? OFFSET ?`;
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

module.exports = { getAuditLogs };