const { all, get } = require('../utils/db-async');

const getDashboardStats = async (req, res) => {
    try {
        // 1. KPI: Low Stock Count
        const lowStock = await get(`SELECT COUNT(id) as count FROM inventory WHERE quantity < min_stock_level`);

        // 2. KPI: Sales This Month
        const date = new Date();
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        
        const salesThisMonth = await get(`
            SELECT SUM(total_amount) as total 
            FROM weekly_sales 
            WHERE week_start_date >= ?
        `, [firstDayOfMonth]);

        // 3. KPI: Total Sellers
        const sellers = await get(`SELECT COUNT(id) as count FROM seller`);

        // 4. CHART DATA: Sales last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

        const chartRawData = await all(`
            SELECT strftime('%Y-%m', week_start_date) as month, SUM(total_amount) as total
            FROM weekly_sales
            WHERE week_start_date >= ?
            GROUP BY month
            ORDER BY month ASC
        `, [sixMonthsAgoStr]);

        // Format data for Chart.js
        const labels = chartRawData.map(item => {
            const [y, m] = item.month.split('-');
            const d = new Date(y, m - 1);
            return d.toLocaleString('default', { month: 'short', year: 'numeric' });
        });
        const data = chartRawData.map(item => item.total);
        const grandTotal = data.reduce((a, b) => a + b, 0);

        res.status(200).json({
            success: true,
            data: {
                lowStockCount: lowStock.count || 0,
                salesMonthTotal: salesThisMonth.total || 0,
                sellerCount: sellers.count || 0,
                chart: { labels, data, grandTotal }
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, data: `Internal Server Error: ${err.message}` });
    }
};

// Widget: Top 5 items low in stock (No pagination needed for dashboard widget)
const getLowStockItems = async (req, res) => {
    try {
        const items = await all(`
            SELECT i.name, ic.name as category_name, i.quantity, i.min_stock_level
            FROM inventory i
            LEFT JOIN inventory_categories ic ON i.category_id = ic.id
            WHERE i.quantity < i.min_stock_level 
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