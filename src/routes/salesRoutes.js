const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Only Admins should likely manage sales, but verifyToken is minimum
router.get('/', verifyToken, isAdmin, salesController.getAllSales);
router.post('/', verifyToken, isAdmin, salesController.createSale);
router.put('/:id', verifyToken, isAdmin, salesController.updateSale);
router.delete('/:id', verifyToken, isAdmin, salesController.deleteSale);

module.exports = router;