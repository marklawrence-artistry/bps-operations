const logAudit = require('../utils/audit-logger');
const { all, get, run } = require('../utils/db-async');

const getAllDocuments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await all(`
            SELECT * FROM documents 
            ORDER BY expiry_date ASC 
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const countResult = await get(`SELECT COUNT(*) as count FROM documents`);
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

const createDocument = async (req, res) => {
    try {
        const { title, category, expiry_date } = req.body;
        if (!req.file) return res.status(400).json({ success: false, data: "No file uploaded." });
        if (!title || !category || !expiry_date) return res.status(400).json({ success: false, data: "Missing fields." });

        const filePath = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        
        const result = await run(`
            INSERT INTO documents (title, category, expiry_date, file_path, status)
            VALUES (?, ?, ?, ?, 'active')
        `, [title, category, expiry_date, filePath]);

        await logAudit(req.user.id, 'CREATE', 'documents', result.lastID, `Uploaded: ${title}`, req.ip);
        res.status(201).json({ success: true, data: "Uploaded.", id: result.lastID });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const updateDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, expiry_date } = req.body;

        await run(`
            UPDATE documents
            SET title = ?, category = ?, expiry_date = ?
            WHERE id = ?
        `, [title, category, expiry_date, id]);

        await logAudit(req.user.id, 'UPDATE', 'documents', id, `Updated Doc ID: ${id}`, req.ip);
        res.status(200).json({ success: true, data: "Document updated." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        await run(`DELETE FROM documents WHERE id = ?`, [id]);
        await run(`DELETE FROM notification_logs WHERE document_id = ?`, [id]);
        
        await logAudit(req.user.id, 'DELETE', 'documents', id, `Deleted Doc ID: ${id}`, req.ip);
        res.status(200).json({ success: true, data: "Deleted." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

module.exports = { getAllDocuments, createDocument, deleteDocument, updateDocument };