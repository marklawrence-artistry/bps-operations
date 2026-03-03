const PDFDocument = require('pdfkit');
const { all, get, run } = require('../utils/db-async');
const logAudit = require('../utils/audit-logger');

const allowedModules = ['inventory', 'seller', 'rts', 'weekly_sales', 'documents'];

const getArchived = async (req, res) => {
    try {
        const { module } = req.params;
        if (!allowedModules.includes(module)) return res.status(400).json({ success: false, data: "Invalid module" });

        // Figure out which column to display as the main name
        let displayCol = 'id';
        if(module === 'inventory' || module === 'seller') displayCol = 'name';
        if(module === 'documents') displayCol = 'title';
        if(module === 'rts') displayCol = 'tracking_no';
        if(module === 'weekly_sales') displayCol = 'week_start_date';

        const rows = await all(`SELECT id, ${displayCol} as display_name, created_at FROM ${module} WHERE record_status = 'archived' ORDER BY created_at DESC`);
        
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, data: err.message });
    }
};

const restoreRecord = async (req, res) => {
    try {
        const { module, id } = req.params;
        if (!allowedModules.includes(module)) return res.status(400).json({ success: false, data: "Invalid module" });

        await run(`UPDATE ${module} SET record_status = 'active' WHERE id = ?`, [id]);
        await logAudit(req.user.id, 'RESTORE', module, id, `Restored ${module} record from archive`, req.ip);
        
        res.status(200).json({ success: true, data: "Record Restored Successfully" });
    } catch (err) {
        res.status(500).json({ success: false, data: err.message });
    }
};

const hardDeleteWithPDF = async (req, res) => {
    try {
        const { module, id } = req.params;
        const { reason } = req.body;
        if (!allowedModules.includes(module)) return res.status(400).send("Invalid module");

        // 1. Fetch the data before we destroy it forever
        const record = await get(`SELECT * FROM ${module} WHERE id = ?`, [id]);
        if (!record) return res.status(404).send("Record not found");

        // 2. Generate PDF Document of the Record
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Deleted_${module}_Record_${id}.pdf"`);
        doc.pipe(res);

        doc.fontSize(20).fillColor('red').text('PERMANENTLY DELETED RECORD', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).fillColor('black').text(`Module: ${module.toUpperCase()}`);
        doc.text(`Record ID: ${id}`);
        doc.text(`Deleted By: User ID ${req.user.id}`);
        doc.text(`Reason for Hard Delete: ${reason || 'Not Provided'}`);
        doc.text(`Date of Deletion: ${new Date().toLocaleString()}`);
        doc.moveDown(2);

        doc.fontSize(14).text('Data Snapshot:', { underline: true });
        doc.moveDown();
        
        // Loop through the data and print it to the PDF
        Object.keys(record).forEach(key => {
            doc.fontSize(10).text(`${key.toUpperCase()}: ${record[key]}`);
            doc.moveDown(0.5);
        });

        doc.end();

        // 3. Actually Hard Delete it from the Database
        await run(`DELETE FROM ${module} WHERE id = ?`, [id]);
        await logAudit(req.user.id, 'HARD_DELETE', module, id, `Permanently deleted ${module} record. PDF exported. Reason: ${reason}`, req.ip);

    } catch (err) {
        if(!res.headersSent) res.status(500).send(err.message);
    }
};

module.exports = { getArchived, restoreRecord, hardDeleteWithPDF };