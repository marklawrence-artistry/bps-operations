const { all, get } = require('../utils/db-async');

const getDashboardStats = async (req, res) => {
    try {
        // 1. KPI: Low Stock Count (Active Only)
        const lowStock = await get(`
            SELECT COUNT(id) as count 
            FROM inventory 
            WHERE quantity < min_stock_level AND record_status = 'active'
        `);

        // 2. KPI: Sales This Month (Active Only) - FIX APPLIED HERE
        const date = new Date();
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        
        const salesThisMonth = await get(`
            SELECT SUM(total_amount) as total 
            FROM weekly_sales 
            WHERE week_start_date >= ? AND record_status = 'active'
        `, [firstDayOfMonth]);

        // 3. KPI: Total Sellers (Active Only)
        const sellers = await get(`SELECT COUNT(id) as count FROM seller WHERE record_status = 'active'`);

        // 4. CHART DATA
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

        // FIX APPLIED HERE: Added AND record_status = 'active'
        const chartRawData = await all(`
            SELECT strftime('%Y-%m', week_start_date) as month, SUM(total_amount) as total
            FROM weekly_sales
            WHERE week_start_date >= ? AND record_status = 'active'
            GROUP BY month
            ORDER BY month ASC
        `, [sixMonthsAgoStr]);
        
        const labels = chartRawData.map(item => {
            const [y, m] = item.month.split('-');
            const d = new Date(y, m - 1);
            return d.toLocaleString('default', { month: 'short', year: 'numeric' });
        });
        const data = chartRawData.map(item => item.total);
        
        const grandTotal = data.reduce((a, b) => a + b, 0);
        const averageMonthlySales = data.length > 0 ? (grandTotal / data.length) : 0;

        res.status(200).json({
            success: true,
            data: {
                lowStockCount: lowStock.count || 0,
                salesMonthTotal: salesThisMonth.total || 0,
                sellerCount: sellers.count || 0,
                chart: { labels, data, grandTotal: averageMonthlySales }
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, data: `Internal Server Error: ${err.message}` });
    }
};

const getLowStockItems = async (req, res) => {
    try {
        // Active Only
        const items = await all(`
            SELECT i.name, ic.name as category_name, i.quantity, i.min_stock_level
            FROM inventory i
            LEFT JOIN inventory_categories ic ON i.category_id = ic.id
            WHERE i.quantity < i.min_stock_level AND i.record_status = 'active'
            ORDER BY i.quantity ASC
            LIMIT 5
        `);
        res.status(200).json({ success: true, data: items });
    } catch (err) {
        res.status(500).json({ success: false, data: `Internal Server Error: ${err.message}` });
    }
};

const backupDatabase = (req, res) => {
    res.status(200).json({ success: true, data: "Backup feature placeholder" });
};

module.exports = { getDashboardStats, getLowStockItems, backupDatabase };