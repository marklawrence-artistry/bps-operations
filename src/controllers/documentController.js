const logAudit = require('../utils/audit-logger');
const { all, get, run } = require('../utils/db-async');
const { getIO } = require('../utils/socket');
const fs = require('fs');     
const path = require('path'); 
const { encryptBuffer, decryptBuffer } = require('../utils/crypto'); 


const getAllDocuments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = `SELECT * FROM documents WHERE record_status = 'active'`;
        let countQuery = `SELECT COUNT(*) as count FROM documents WHERE record_status = 'active'`;
        let params = [];

        if(search) {
            const searchSQL = ` AND (title LIKE ? OR category LIKE ?)`;
            query += searchSQL;
            countQuery += searchSQL;
            params.push(`%${search}%`, `%${search}%`);
        }

        if(req.query.category) {
            query += ` AND category = ?`;
            countQuery += ` AND category = ?`;
            params.push(req.query.category);
        }

        const sortOrder = req.query.sort === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY created_at ${sortOrder} LIMIT ? OFFSET ?`;
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

const createDocument = async (req, res) => {
    try {
        const { title, category, expiry_date } = req.body;
        if (!req.file) return res.status(400).json({ success: false, data: "No file uploaded." });
        if (!title || !category || !expiry_date) return res.status(400).json({ success: false, data: "Missing fields." });

        const fileBuffer = fs.readFileSync(req.file.path);
        
        // --- NEW: Malicious PDF Scan ---
        if (req.file.mimetype === 'application/pdf') {
            const contentString = fileBuffer.toString('utf8');
            // Basic heuristic for PDF malware (Embedded JS/Auto-execution)
            if (contentString.includes('/JavaScript') || contentString.includes('/JS') || contentString.includes('/OpenAction')) {
                fs.unlinkSync(req.file.path); // Delete the malicious file immediately
                return res.status(400).json({ success: false, data: "Security Alert: Upload blocked. Malicious code detected in PDF." });
            }
        }

        // --- NEW: Encrypt the file on disk ---
        const encryptedBuffer = encryptBuffer(fileBuffer);
        fs.writeFileSync(req.file.path, encryptedBuffer); // Overwrite with encrypted data

        const filePath = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        
        const result = await run(`
            INSERT INTO documents (title, category, expiry_date, file_path, status)
            VALUES (?, ?, ?, ?, 'active')
        `, [title, category, expiry_date, filePath]);

        await logAudit(req.user.id, 'CREATE', 'documents', result.lastID, `Uploaded: ${title}`, req.ip);
        getIO().emit('document_update');
        res.status(201).json({ success: true, data: "Uploaded securely.", id: result.lastID });
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
        getIO().emit('document_update');
        res.status(200).json({ success: true, data: "Document updated." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const reason = req.body.reason || "No reason provided";
        
        // 1. Delete the physical file (Keep this logic)
        const doc = await get(`SELECT file_path FROM documents WHERE id = ?`, [id]);
        if (doc && doc.file_path) {
            if (doc && typeof doc.file_path === 'string') {
                const filename = doc.file_path.split('/').pop();
                const uploadDir = process.env.RAILWAY_VOLUME_MOUNT_PATH 
                    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
                    : path.join(__dirname, '../../public/uploads');
                const filePath = path.join(uploadDir, filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            
        }

        await run(`DELETE FROM notification_logs WHERE document_id = ?`, [id]);
        
        await run(`UPDATE documents SET record_status = 'archived' WHERE id = ?`, [id]);
        
        await logAudit(req.user.id, 'ARCHIVE', 'documents', id, `Deleted Doc ID: ${id}. Reason: ${reason}`, req.ip);
        getIO().emit('document_update');
        res.status(200).json({ success: true, data: "Deleted." });
    } catch (err) {
        console.error("Delete Doc Error:", err);
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const viewDocument = async (req, res) => {
    try {
        const doc = await get(`SELECT file_path FROM documents WHERE id = ?`, [req.params.id]);
        if (!doc) return res.status(404).send("Document not found.");

        const filename = doc.file_path.split('/').pop();
        const uploadDir = process.env.RAILWAY_VOLUME_MOUNT_PATH 
            ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')
            : path.join(__dirname, '../../public/uploads');
            
        const filePath = path.join(uploadDir, filename);

        if (!fs.existsSync(filePath)) return res.status(404).send("File missing from disk.");

        const encryptedBuffer = fs.readFileSync(filePath);
        const decryptedBuffer = decryptBuffer(encryptedBuffer);

        // Determine content type
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.pdf') contentType = 'application/pdf';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';

        res.setHeader('Content-Type', contentType);
        res.send(decryptedBuffer);
    } catch (err) {
        res.status(500).send("Error decrypting file.");
    }
};

// Make sure to export viewDocument at the bottom!
module.exports = { getAllDocuments, createDocument, deleteDocument, updateDocument, viewDocument };