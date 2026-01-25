const { all } = require('../utils/db-async');

const getAuditLogs = async (req, res) => {
    try {
        // Join with users to get username. 
        // We use LEFT JOIN in case a user was deleted but their logs remain.
        const query = `
            SELECT 
                audit_logs.*, 
                users.username 
            FROM audit_logs 
            LEFT JOIN users ON audit_logs.user_id = users.id 
            ORDER BY audit_logs.created_at DESC
            LIMIT 100
        `;
        const rows = await all(query);
        res.status(200).json({success: true, data: rows});
    } catch (err) {
        res.status(500).json({success: false, data: `Internal Server Error: ${err.message}`});
    }
};

module.exports = { getAuditLogs };