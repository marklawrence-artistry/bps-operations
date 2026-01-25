const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Dashboard routes should be protected and likely admin-only
router.get('/stats', verifyToken, isAdmin, dashboardController.getDashboardStats);
router.get('/low-stock', verifyToken, dashboardController.getLowStockItems);
router.post('/backup', verifyToken, isAdmin, dashboardController.backupDatabase);

module.exports = router;