const logAudit = require('../utils/audit-logger');
const { all, get, run } = require('../utils/db-async');

const createSeller = async (req, res) => {
    try {
        const { name, category, contact_num, email, platform_name, staff_id } = req.body;

        if (!name || !category || !contact_num || !email || !platform_name) {
            return res.status(400).json({ success: false, data: "All fields are required." });
        }

        // Image is optional, but if provided, use it
        const imageUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;

        const query = `
            INSERT INTO seller (name, category, contact_num, email, image_path, platform_name, staff_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [name, category, contact_num, email, imageUrl, platform_name, staff_id || req.user.id];

        const result = await run(query, params);
        await logAudit(req.user.id, 'CREATE', 'seller', result.lastID, `Created seller profile ${name}`, req.ip);

        res.status(201).json({ success: true, data: "Seller created.", id: result.lastID });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const getAllSeller = async (req, res) => {
    try {
        // Support for dropdowns (fetch all names without pagination)
        if (req.query.all === 'true') {
            const rows = await all(`SELECT id, name FROM seller ORDER BY name ASC`);
            return res.status(200).json({ success: true, data: rows });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await all(`
            SELECT id, name, category, contact_num, email, image_path, platform_name, created_at 
            FROM seller 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const countResult = await get(`SELECT COUNT(*) as count FROM seller`);
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

const getSeller = async (req, res) => {
    try {
        const { id } = req.params;
        const row = await get(`SELECT * FROM seller WHERE id = ?`, [id]);

        if (!row) {
            return res.status(404).json({ success: false, data: "Seller profile not found." });
        }

        res.status(200).json({ success: true, data: row });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const updateSeller = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, contact_num, email, platform_name, staff_id } = req.body;

        let imageUrl = null;
        if (req.file) {
            imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        await run(`
            UPDATE seller
            SET
                name = COALESCE(?, name),
                category = COALESCE(?, category),
                contact_num = COALESCE(?, contact_num),
                email = COALESCE(?, email),
                image_path = COALESCE(?, image_path),
                platform_name = COALESCE(?, platform_name),
                staff_id = COALESCE(?, staff_id)
            WHERE id = ?
        `, [name, category, contact_num, email, imageUrl, platform_name, staff_id, id]);

        await logAudit(req.user.id, 'UPDATE', 'seller', id, `Updated seller profile ID: ${id}`, req.ip);

        res.status(200).json({ success: true, data: "Seller profile updated." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const deleteSeller = async (req, res) => {
    try {
        const { id } = req.params;
        await run(`DELETE FROM seller WHERE id = ?`, [id]);
        await logAudit(req.user.id, 'DELETE', 'seller', id, `Deleted seller ID: ${id}`, req.ip);
        res.status(200).json({ success: true, data: "Seller deleted." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

module.exports = {
    createSeller,
    getAllSeller,
    getSeller,
    updateSeller,
    deleteSeller
};