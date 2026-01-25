const { all, get } = require('../utils/db-async');
const fs = require('fs');
const path = require('path');
const DB_SOURCE = "bps.db";

const getDashboardStats = async (req, res) => {
    try {
        const lowStock = await get(`SELECT COUNT(id) as count FROM inventory WHERE quantity < min_stock_level`);

        const today = new Date();
        const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        const salesThisMonth = await get(`
            SELECT SUM(total_amount) as total FROM weekly_sales WHERE week_start_date >= ?
        `, [monthStart]);

        const sellers = await get(`SELECT COUNT(id) as count FROM seller`);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const chartData = await all(`
            SELECT strftime('%Y-%m', week_start_date) as month, SUM(total_amount) as total
            FROM weekly_sales
            WHERE week_start_date >= ?
            GROUP BY month
            ORDER BY month ASC
        `, [`${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`]);


        res.status(200).json({
            success: true,
            data: {
                lowStockCount: lowStock.count || 0,
                salesThisMonth: salesThisMonth.total || 0,
                sellerCount: sellers.count || 0,
                salesChart: chartData
            }
        });

    } catch (err) {
        res.status(500).json({success: false, data: `Internal Server Error: ${err.message}`});
    }
};

const getLowStockItems = async (req, res) => {
    try {
        const items = await all(`
            SELECT i.name, ic.name as category_name, i.quantity, i.min_stock_level
            FROM inventory i
            LEFT JOIN inventory_categories ic ON i.category_id = ic.id
            WHERE i.quantity < i.min_stock_level 
            ORDER BY i.quantity ASC
        `);
        res.status(200).json({ success: true, data: items });
    } catch (err) {
        res.status(500).json({ success: false, data: `Internal Server Error: ${err.message}` });
    }
};

const backupDatabase = (req, res) => {
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)){
        fs.mkdirSync(backupDir);
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFileName = `bps-backup-${timestamp}.db`;
    const backupFilePath = path.join(backupDir, backupFileName);
    const dbPath = path.join(__dirname, '../../', DB_SOURCE);

    try {
        fs.copyFileSync(dbPath, backupFilePath);
        console.log(`Successfully backed up database to ${backupFilePath}`);
        res.status(200).json({ success: true, data: `Database backed up to ${backupFileName}` });
    } catch (err) {
        console.error("DATABASE BACKUP FAILED:", err);
        res.status(500).json({ success: false, data: `Internal Server Error: ${err.message}` });
    }
};

module.exports = { getDashboardStats, getLowStockItems, backupDatabase };