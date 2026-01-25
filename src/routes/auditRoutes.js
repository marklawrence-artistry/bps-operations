const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken } = require('../middleware/authMiddleware');

// Everyone logged in can view, or restrict to Admin if preferred.
router.get('/', verifyToken, auditController.getAuditLogs);

module.exports = router;