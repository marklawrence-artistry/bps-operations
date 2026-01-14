const logAudit = require('../utils/audit-logger');
const { all, get, run } = require('../utils/db-async');

// Inventory Categories
const createInventoryCategory = async (req, res) => {
    try {
        const { name, description, staff_id } = req.body;

        // 1. CHECK EXISTENCE
        if(!name, !description, !staff_id) {
            return res.status(400).json({success:false,data:`All fields are required. Name: ${name}, Description: ${description}, Staff ID: ${staff_id}`});
        }

        const result = await run(`
            INSERT INTO inventory_categories (name, description, staff_id)
            VALUES (?, ?, ?)  
        `, [name, description, staff_id]);

        await logAudit(req.user.id, 'CREATE', 'inventory_category', result.lastID, `Created category ${name}`, req.ip);

        res.status(201).json({success:true,data:"Inventory category created successfully.",id: result.lastID});
    } catch(err) {
        return res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`});
    }
}
const deleteInventoryCategory = async (req, res) => {
    try {
        const {id} = req.params
        if(!id) {
            return res.status(400).json({success:false,data:"ID is required, fix your API."});
        }

        await run(`
            DELETE FROM inventory_categories WHERE id = ?
        `, [id])

        await logAudit(req.user.id, 'DELETE', 'inventory_categories', id, `Deleted item ID: ${id}`, req.ip);

        res.status(201).json({success:true,data:`Item no.${id} deleted successfully.`});
    } catch(err) {
        res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`});
    }
}
const getAllInventoryCategories = async (req, res) => {
    try {
        const inventory_categories = await all(`
            SELECT id, name, description FROM inventory_categories    
        `)

        res.status(200).json({success:true,data:inventory_categories})
    } catch(err) {
        res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`})
    }
}


// Inventory
const getAllInventory = async (req, res) => {
    try {
        const inventory = await all(`
            SELECT id, name, category_id, quantity, min_stock_level, image_url FROM inventory
        `)

        res.status(200).json({success:true,data:inventory})
    } catch(err) {
        res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`})
    }
}
const createInventory = async (req, res) => {
    try {
        const { name, category_id, quantity, min_stock_level, staff_id } = req.body;

        if(!req.file) {
            return res.status(400).json({success:false,data:"No image file uploaded."});
        }

        if(!name || !category_id || !quantity || !min_stock_level || !staff_id) {
            return res.status(400).json({success:false,data:`All fields required. ${name, category_id, quantity, min_stock_level, staff_id}`});
        }

        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
        const query = `
            INSERT INTO inventory (name, category_id, quantity, min_stock_level, image_url, staff_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const params = [name, category_id, quantity, min_stock_level, imageUrl, staff_id];

        const result = await run(query, params);

        await logAudit(req.user.id, 'CREATE', 'inventory', result.lastID, `Created inventory item ${name}`, req.ip);

        res.status(200).json({
            success:true,
            data:"Inventory item successfully created.",
            id:result.lastID
        });
    } catch(err) {
        res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`});
    }
}
const deleteInventory = async (req, res) => {
    try {
        const { id } = req.params;

        if(!id) {
            return res.status(400).json({success:false,data:"ID is required."});
        }

        const result = await run(`
            DELETE FROM inventory WHERE id = ?    
        `, [id]);

        await logAudit(req.user.id, 'DELETE', 'inventory', result.lastID, `Delete inventory item no.${id}`, req.ip);
        
        res.status(200).json({success:true,data:"Deleted inventory item successfully.",id:result.id});
    } catch(err) {
        res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`});
    }
}
const getInventory = async (req, res) => {
    try {
        const { id } = req.params;
        if(!id) {
            return res.status(400).json({success:false,data:"ID is required, fix your API."});
        }

        const item = await get(`
            SELECT id, name, category_id, quantity, min_stock_level, staff_id, image_url FROM inventory WHERE id = ?
        `, [id]);

        res.status(201).json({success:true,data:item});
    } catch(err) {
        res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`})
    }
}
const updateInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category_id, quantity, min_stock_level, staff_id } = req.body;

        if(!id) {
            return res.status(400).json({success:false,data:"ID is required, fix your API."});
        }

        let imageUrl = null;

        if(req.file) {
            imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
        }

        const query = `
            UPDATE inventory 
            SET
                name = COALESCE(?, name),
                category_id = COALESCE(?, category_id),
                quantity = COALESCE(?, quantity),
                min_stock_level = COALESCE(?, min_stock_level),
                image_url = COALESCE(?, image_url),
                staff_id = COALESCE(?, staff_id)
            WHERE id = ?
        `;
        const params = [name, category_id, quantity, min_stock_level, imageUrl, staff_id, id]

        const result = await run(query, params)

        res.status(200).json({
            success:true,
            data:"Inventory item successfully updated.",
            id:result.lastID
        });
    } catch(err) {
        res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`})
    }
}


module.exports = {
    createInventoryCategory,
    deleteInventoryCategory,
    getAllInventoryCategories,

    getAllInventory,
    createInventory,
    deleteInventory,
    getInventory,
    updateInventory
}