const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Admin Email Settings
router.get('/settings', verifyToken, isAdmin, systemController.getSettings);
router.post('/settings', verifyToken, isAdmin, systemController.updateSettings);

// Backup/Restore
router.get('/backup', verifyToken, isAdmin, systemController.createBackup);
router.post('/restore', verifyToken, isAdmin, upload.single('backup_file'), systemController.restoreBackup);
router.get('/health', verifyToken, isAdmin, systemController.getSystemHealth);

module.exports = router;