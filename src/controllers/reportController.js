const PDFDocument = require('pdfkit-table');
const { all } = require('../utils/db-async');

// --- API to get JSON data for Frontend Chart/Table Preview ---
const getReportPreview = async (req, res) => {
    try {
        // Log request to server console for debugging
        console.log(`[Report Preview] Type: ${req.query.type}, Range: ${req.query.startDate} to ${req.query.endDate}`);

        const { type, startDate, endDate } = req.query;

        if (type === 'sales') {
            let query = `SELECT id, week_start_date, week_end_date, total_amount, notes FROM weekly_sales`;
            const params = [];

            // Only filter if both dates are provided and not empty strings
            if (startDate && endDate) {
                query += ` WHERE week_start_date >= ? AND week_end_date <= ?`;
                params.push(startDate, endDate);
            }
            query += ` ORDER BY week_start_date ASC`; 

            const rows = await all(query, params);
            
            // Format for Chart.js (Ensure data is numeric)
            const labels = rows.map(r => r.week_start_date);
            const data = rows.map(r => Number(r.total_amount) || 0);

            return res.status(200).json({ 
                success: true, 
                data: { rows, chart: { labels, data } } 
            });

        } else if (type === 'inventory') {
            const rows = await all(`
                SELECT i.name, ic.name as category, i.quantity, i.min_stock_level 
                FROM inventory i
                LEFT JOIN inventory_categories ic ON i.category_id = ic.id
                ORDER BY i.quantity ASC
            `);

            return res.status(200).json({ 
                success: true, 
                data: { rows, chart: null } 
            });
        }

        console.warn(`[Report Preview] Invalid type requested: ${type}`);
        res.status(400).json({ success: false, data: "Invalid report type" });

    } catch (err) {
        console.error("[Report Preview] Error:", err.message);
        res.status(500).json({ success: false, data: err.message });
    }
};

// --- PDF Generation ---
const generateReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        let rows = [];
        let tableTitle = "";
        let tableHeaders = [];
        let totalRevenue = 0;

        // 1. FETCH DATA
        if (type === 'inventory') {
            rows = await all(`
                SELECT i.name, ic.name as category, i.quantity, i.min_stock_level 
                FROM inventory i
                LEFT JOIN inventory_categories ic ON i.category_id = ic.id
                ORDER BY i.name ASC
            `);
            tableTitle = "Inventory Status";
            tableHeaders = ["Item", "Category", "Qty", "Min", "Status"];

        } else if (type === 'sales') {
            let query = `SELECT week_start_date, week_end_date, total_amount, notes FROM weekly_sales`;
            const params = [];

            if(startDate && endDate) {
                query += ` WHERE week_start_date >= ? AND week_end_date <= ?`;
                params.push(startDate, endDate);
            }
            query += ` ORDER BY week_start_date DESC`;

            rows = await all(query, params);
            tableTitle = "Sales Records";
            tableHeaders = ["Start", "End", "Amount (PHP)", "Notes"];
            
            totalRevenue = rows.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
        } else {
            return res.status(400).send("Invalid Report Type");
        }

        // 2. CHECK EMPTY
        if (!rows || rows.length === 0) {
            return res.status(404).send("No records found for the selected criteria.");
        }

        // 3. GENERATE PDF
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const filename = `${type}_report_${Date.now()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        doc.fontSize(20).font('Helvetica-Bold').text('Bicodo Postal Services', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text('Operations System Report', { align: 'center' });
        doc.moveDown();

        doc.fontSize(10).text(`Report Category: ${type.toUpperCase()}`);
        doc.text(`Generated: ${new Date().toLocaleString()}`);
        if(startDate && endDate) doc.text(`Range: ${startDate} to ${endDate}`);
        doc.moveDown();

        // Prepare Table
        let tableRows = [];
        if (type === 'inventory') {
            tableRows = rows.map(r => [
                r.name || 'N/A', 
                r.category || 'Uncategorized', 
                String(r.quantity), 
                String(r.min_stock_level),
                r.quantity <= r.min_stock_level ? 'LOW' : 'OK'
            ]);
        } else if (type === 'sales') {
            tableRows = rows.map(r => [
                r.week_start_date,
                r.week_end_date,
                Number(r.total_amount).toLocaleString('en-PH', {minimumFractionDigits: 2}),
                r.notes || ''
            ]);
        }

        const table = {
            title: tableTitle,
            headers: tableHeaders,
            rows: tableRows
        };

        await doc.table(table, { width: 500 });

        if (type === 'sales') {
            doc.moveDown();
            doc.font('Helvetica-Bold').text(`Total Revenue: PHP ${totalRevenue.toLocaleString('en-PH', {minimumFractionDigits: 2})}`, { align: 'right' });
        }

        doc.end();

    } catch (err) {
        console.error("PDF Error:", err);
        if (!res.headersSent) res.status(500).send("Error generating PDF: " + err.message);
    }
};

module.exports = { generateReport, getReportPreview };