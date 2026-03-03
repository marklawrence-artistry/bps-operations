const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { getDB, reloadDB, checkAndApplyMigrations } = require('../database'); 
const { get, run, all } = require('../utils/db-async');
const { encryptBuffer } = require('../utils/crypto');

const DB_NAME = "bps.db";

// --- FIX: DYNAMIC PATH DEFINITIONS ---
// 1. Define where the Database lives
const DB_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, DB_NAME) 
    : path.resolve(__dirname, '../../', DB_NAME);

// 2. Define where Uploads live
const UPLOADS_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads') 
    : path.join(__dirname, '../../public/uploads');

// 3. Define where Backups are saved
const BACKUP_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'backups') 
    : path.join(__dirname, '../../backups');

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
        
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
        
        const filePath = path.join(BACKUP_DIR, filename);
        const output = fs.createWriteStream(filePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            res.download(filePath, filename);
        });

        archive.on('error', (err) => res.status(500).send({error: err.message}));
        archive.pipe(output);

        // Add Database File
        if (fs.existsSync(DB_PATH)) archive.file(DB_PATH, { name: DB_NAME });
        
        // Add Uploads Folder (Now points to the correct Volume path)
        if (fs.existsSync(UPLOADS_PATH)) archive.directory(UPLOADS_PATH, 'uploads');

        await archive.finalize();
    } catch (error) {
        if(!res.headersSent) res.status(500).json({ success: false, data: "Backup failed." });
    }
};

// --- SYSTEM HEALTH ---
const getFolderSize = (dirPath) => {
    let totalSize = 0;
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                totalSize += getFolderSize(fullPath);
            } else {
                totalSize += stats.size;
            }
        }
    }
    return totalSize;
};

const getSystemHealth = async (req, res) => {
    try {
        // 1. Server Uptime
        const uptimeSeconds = process.uptime();
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const uptimeFormatted = `${hours}h ${minutes}m`;

        // 2. Database + Uploads Size
        let totalBytes = 0;
        if (fs.existsSync(DB_PATH)) {
            totalBytes += fs.statSync(DB_PATH).size;
        }
        // Now this uses the correct Volume path on Railway
        totalBytes += getFolderSize(UPLOADS_PATH);
        
        const totalSizeMB = (totalBytes / (1024 * 1024)).toFixed(2);

        // 3. Last Backup
        let lastBackupDate = "No backups yet";
        
        if (fs.existsSync(BACKUP_DIR)) {
            const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.zip'));
            if (files.length > 0) {
                const sortedFiles = files.map(f => ({
                    name: f,
                    time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
                })).sort((a, b) => b.time - a.time);
                lastBackupDate = new Date(sortedFiles[0].time).toLocaleString();
            }
        }

        res.status(200).json({
            success: true,
            data: { uptime: uptimeFormatted, dbSize: totalSizeMB, lastBackup: lastBackupDate }
        });
    } catch(err) {
        res.status(500).json({ success: false, data: err.message });
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
                // Determine destination based on Volume vs Local
                const destPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
                    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, entry.entryName)
                    : path.join(__dirname, '../../public/', entry.entryName);

                const dir = path.dirname(destPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(destPath, entry.getData());
            }
        });

        // 2. Restore DB
        const dbEntry = zipEntries.find(e => e.entryName === DB_NAME);
        if (dbEntry) {
            console.log("Closing DB for Restore...");
            const currentDb = getDB();
            currentDb.close(async (err) => {
                if (err) {
                    console.error("Error closing DB:", err);
                    return res.status(500).json({ success: false, data: "DB Busy." });
                }

                try {
                    fs.writeFileSync(DB_PATH, dbEntry.getData());
                    console.log("DB File Overwritten.");

                    await reloadDB();
                    checkAndApplyMigrations(); 
                    console.log("Migrations applied to restored database.");

                    if(fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                    res.status(200).json({ success: true, data: "Restore complete! Data refreshed." });

                } catch (writeErr) {
                    console.error("Write Error:", writeErr);
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

const encryptLegacyDocuments = async (req, res) => {
    try {
        const documents = await all(`SELECT file_path FROM documents`);
        let successCount = 0;
        let failCount = 0;

        for (const doc of documents) {
            const filename = doc.file_path.split('/').pop();
            const filePath = path.join(UPLOADS_PATH, filename); // Uses correct path now

            if (fs.existsSync(filePath)) {
                const buffer = fs.readFileSync(filePath);
                
                const isUnencrypted = 
                    buffer.includes(Buffer.from('25504446', 'hex')) || 
                    buffer.includes(Buffer.from('89504e47', 'hex')) || 
                    buffer.includes(Buffer.from('ffd8ffe0', 'hex')) || 
                    buffer.includes(Buffer.from('ffd8ffe1', 'hex'));

                if (isUnencrypted) {
                    const encryptedBuffer = encryptBuffer(buffer);
                    fs.writeFileSync(filePath, encryptedBuffer);
                    successCount++;
                } else {
                    failCount++; 
                }
            }
        }

        res.status(200).json({ 
            success: true, 
            data: `Migration Complete. Encrypted ${successCount} legacy files. Skipped ${failCount} files.` 
        });
    } catch (error) {
        console.error("Encryption Migration Error:", error);
        res.status(500).json({ success: false, data: error.message });
    }
};

module.exports = { createBackup, getSystemHealth, restoreBackup, getSettings, updateSettings, encryptLegacyDocuments };