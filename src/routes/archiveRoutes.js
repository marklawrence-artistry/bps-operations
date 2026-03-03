const express = require('express');
const router = express.Router();
const archiveController = require('../controllers/archiveController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Only Admins should access the archive
router.get('/:module', verifyToken, isAdmin, archiveController.getArchived);
router.put('/restore/:module/:id', verifyToken, isAdmin, archiveController.restoreRecord);
router.post('/hard-delete/:module/:id', verifyToken, isAdmin, archiveController.hardDeleteWithPDF);

module.exports = router;