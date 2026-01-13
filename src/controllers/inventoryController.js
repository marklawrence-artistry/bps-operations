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
        return res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`});
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


module.exports = {
    createInventoryCategory,
    deleteInventoryCategory,
    getAllInventoryCategories
}