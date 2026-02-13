const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
// Import reloadDB and getDB
const { getDB, reloadDB } = require('../database'); 
const { get, run } = require('../utils/db-async');

const DB_NAME = "bps.db";
const DB_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, DB_NAME) 
    : path.resolve(__dirname, '../../', DB_NAME);

const UPLOADS_PATH = path.join(__dirname, '../../public/uploads');

const getSettings = async (req, res) => {
    try {
        const setting = await get(`SELECT value FROM settings WHERE key = 'admin_email'`);
        res.json({ success: true, data: { admin_email: setting ? setting.value : '' } });
    } catch (err) { res.status(500).json({ success: false, data: err.message }); }
};

const updateSettings = async (req, res) => {
    try {
        const { admin_email } = req.body;
        await run(`UPDATE settings SET value = ? WHERE key = 'admin_email'`, [admin_email]);
        res.json({ success: true, data: "Settings updated." });
    } catch (err) { res.status(500).json({ success: false, data: err.message }); }
};

// --- BACKUP ---
const createBackup = async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `bps_backup_${timestamp}.zip`;
        res.attachment(filename);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => res.status(500).send({error: err.message}));
        archive.pipe(res);

        // NOTE: We do not close the DB here. Sqlite allows reading while open.
        if (fs.existsSync(DB_PATH)) archive.file(DB_PATH, { name: DB_NAME });
        if (fs.existsSync(UPLOADS_PATH)) archive.directory(UPLOADS_PATH, 'uploads');

        await archive.finalize();
    } catch (error) {
        if(!res.headersSent) res.status(500).json({ success: false, data: "Backup failed." });
    }
};

// --- RESTORE (HOT RELOAD VERSION) ---
const restoreBackup = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, data: "No file." });

        const zipPath = req.file.path;
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();

        // 1. Restore Images
        zipEntries.forEach(entry => {
            if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
                const fullPath = path.join(__dirname, '../../public/', entry.entryName);
                const dir = path.dirname(fullPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(fullPath, entry.getData());
            }
        });

        // 2. Restore DB
        const dbEntry = zipEntries.find(e => e.entryName === DB_NAME);
        if (dbEntry) {
            console.log("Closing DB for Restore...");
            
            // A. Close the existing connection to release file locks
            const currentDb = getDB();
            currentDb.close(async (err) => {
                if (err) {
                    console.error("Error closing DB:", err);
                    return res.status(500).json({ success: false, data: "DB Busy." });
                }

                try {
                    // B. Overwrite the file
                    fs.writeFileSync(DB_PATH, dbEntry.getData());
                    console.log("DB File Overwritten.");

                    // C. Re-open the connection (Hot Reload)
                    await reloadDB();
                    console.log("DB Hot Reloaded.");

                    // Cleanup
                    if(fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

                    // Send Success (Server stays alive!)
                    res.status(200).json({ success: true, data: "Restore complete! Data refreshed." });

                } catch (writeErr) {
                    console.error("Write Error:", writeErr);
                    // Try to reconnect even if write failed to save the app
                    await reloadDB();
                    res.status(500).json({ success: false, data: "Restore Write Failed." });
                }
            });
            
        } else {
            if(fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            res.status(200).json({ success: true, data: "Images restored. No DB found." });
        }

    } catch (error) {
        console.error(error);
        if(req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, data: "Restore failed: " + error.message });
    }
};

module.exports = { createBackup, restoreBackup, getSettings, updateSettings };