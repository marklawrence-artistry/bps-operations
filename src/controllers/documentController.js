const logAudit = require('../utils/audit-logger');
const { all, get, run } = require('../utils/db-async');

const getAllDocuments = async (req, res) => {
    try {
        // Order by expiry date ascending to see what expires soonest first
        const rows = await all(`SELECT * FROM documents ORDER BY expiry_date ASC`);
        res.status(200).json({success: true, data: rows});
    } catch (err) {
        res.status(500).json({success: false, data: `Internal Server Error: ${err.message}`});
    }
};

const createDocument = async (req, res) => {
    try {
        const { title, category, expiry_date } = req.body;

        if (!req.file) {
            return res.status(400).json({success: false, data: "No document file uploaded."});
        }
        if (!title || !category || !expiry_date) {
            return res.status(400).json({success: false, data: "Title, Category, and Expiry Date are required."});
        }

        const filePath = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        const result = await run(`
            INSERT INTO documents (title, category, expiry_date, file_path, status)
            VALUES (?, ?, ?, ?, 'active')
        `, [title, category, expiry_date, filePath]);

        await logAudit(req.user.id, 'CREATE', 'documents', result.lastID, `Uploaded document: ${title}`, req.ip);

        res.status(201).json({success: true, data: "Document uploaded successfully.", id: result.lastID});
    } catch (err) {
        res.status(500).json({success: false, data: `Internal Server Error: ${err.message}`});
    }
};

const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({success: false, data: "ID is required."});

        // Optional: You could use 'fs' to unlink/delete the actual file here too.

        await run(`DELETE FROM documents WHERE id = ?`, [id]);
        // Also clean up logs for this document
        await run(`DELETE FROM notification_logs WHERE document_id = ?`, [id]);

        await logAudit(req.user.id, 'DELETE', 'documents', id, `Deleted document ID: ${id}`, req.ip);

        res.status(200).json({success: true, data: "Document record deleted."});
    } catch (err) {
        res.status(500).json({success: false, data: `Internal Server Error: ${err.message}`});
    }
};

// Simple update (mostly for dates or titles, re-uploading usually means new entry or complex logic)
const updateDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, expiry_date, status } = req.body;

        await run(`
            UPDATE documents
            SET 
                title = COALESCE(?, title),
                category = COALESCE(?, category),
                expiry_date = COALESCE(?, expiry_date),
                status = COALESCE(?, status)
            WHERE id = ?
        `, [title, category, expiry_date, status, id]);

        await logAudit(req.user.id, 'UPDATE', 'documents', id, `Updated document details ID: ${id}`, req.ip);

        res.status(200).json({success: true, data: "Document updated."});
    } catch (err) {
        res.status(500).json({success: false, data: `Internal Server Error: ${err.message}`});
    }
};

module.exports = { getAllDocuments, createDocument, deleteDocument, updateDocument };