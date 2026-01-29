const logAudit = require('../utils/audit-logger');
const { all, get, run } = require('../utils/db-async');

// --- INVENTORY CATEGORIES ---

const createInventoryCategory = async (req, res) => {
    try {
        const { name, description, staff_id } = req.body;

        if (!name || !description) {
            return res.status(400).json({ success: false, data: "Name and description are required." });
        }

        const result = await run(`
            INSERT INTO inventory_categories (name, description, staff_id)
            VALUES (?, ?, ?)  
        `, [name, description, staff_id || req.user.id]);

        await logAudit(req.user.id, 'CREATE', 'inventory_categories', result.lastID, `Created category ${name}`, req.ip);
        res.status(201).json({ success: true, data: "Category created.", id: result.lastID });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const deleteInventoryCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await run(`DELETE FROM inventory_categories WHERE id = ?`, [id]);
        await logAudit(req.user.id, 'DELETE', 'inventory_categories', id, `Deleted category ID: ${id}`, req.ip);
        res.status(200).json({ success: true, data: "Category deleted." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const getAllInventoryCategories = async (req, res) => {
    try {
        // If 'all' query param is present, return everything (useful for dropdowns)
        if (req.query.all === 'true') {
            const categories = await all(`SELECT id, name, description FROM inventory_categories`);
            return res.status(200).json({ success: true, data: categories });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const categories = await all(`SELECT id, name, description FROM inventory_categories LIMIT ? OFFSET ?`, [limit, offset]);
        const countResult = await get(`SELECT COUNT(*) as count FROM inventory_categories`);
        
        const totalItems = countResult.count;
        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            success: true,
            data: categories,
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


// --- INVENTORY ITEMS ---

const getAllInventory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const query = `
            SELECT i.id, i.name, i.category_id, ic.name as category_name, i.quantity, i.min_stock_level, i.image_url 
            FROM inventory i
            LEFT JOIN inventory_categories ic ON i.category_id = ic.id
            ORDER BY i.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const inventory = await all(query, [limit, offset]);
        const countResult = await get(`SELECT COUNT(*) as count FROM inventory`);
        
        const totalItems = countResult.count;
        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            success: true,
            data: inventory,
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

const createInventory = async (req, res) => {
    try {
        const { name, category_id, quantity, min_stock_level, staff_id } = req.body;

        if (!name || !category_id || !quantity || !min_stock_level) {
            return res.status(400).json({ success: false, data: "All fields except image are required." });
        }

        const imageUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;
        
        const result = await run(`
            INSERT INTO inventory (name, category_id, quantity, min_stock_level, image_url, staff_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, category_id, quantity, min_stock_level, imageUrl, staff_id || req.user.id]);

        await logAudit(req.user.id, 'CREATE', 'inventory', result.lastID, `Created item ${name}`, req.ip);

        res.status(200).json({ success: true, data: "Item created.", id: result.lastID });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const deleteInventory = async (req, res) => {
    try {
        const { id } = req.params;
        await run(`DELETE FROM inventory WHERE id = ?`, [id]);
        await logAudit(req.user.id, 'DELETE', 'inventory', id, `Deleted item ID: ${id}`, req.ip);
        res.status(200).json({ success: true, data: "Item deleted." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const getInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await get(`SELECT * FROM inventory WHERE id = ?`, [id]);
        if (!item) return res.status(404).json({ success: false, data: "Item not found." });
        res.status(200).json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const updateInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category_id, quantity, min_stock_level, staff_id } = req.body;

        let imageUrl = null;
        if (req.file) {
            imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        await run(`
            UPDATE inventory 
            SET
                name = COALESCE(?, name),
                category_id = COALESCE(?, category_id),
                quantity = COALESCE(?, quantity),
                min_stock_level = COALESCE(?, min_stock_level),
                image_url = COALESCE(?, image_url),
                staff_id = COALESCE(?, staff_id)
            WHERE id = ?
        `, [name, category_id, quantity, min_stock_level, imageUrl, staff_id, id]);

        await logAudit(req.user.id, 'UPDATE', 'inventory', id, `Updated item ID: ${id}`, req.ip);

        res.status(200).json({ success: true, data: "Item updated." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

module.exports = {
    createInventoryCategory,
    deleteInventoryCategory,
    getAllInventoryCategories,
    getAllInventory,
    createInventory,
    deleteInventory,
    getInventory,
    updateInventory
};