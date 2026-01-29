const { all, get } = require('../utils/db-async');

const getAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const query = `
            SELECT audit_logs.*, users.username 
            FROM audit_logs 
            LEFT JOIN users ON audit_logs.user_id = users.id 
            ORDER BY audit_logs.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const rows = await all(query, [limit, offset]);
        const countResult = await get(`SELECT COUNT(*) as count FROM audit_logs`);
        
        const totalItems = countResult.count;
        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            success: true, 
            data: rows,
            pagination: {
                current: page,
                limit: limit,
                totalItems: totalItems,
                totalPages: totalPages
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

module.exports = { getAuditLogs };