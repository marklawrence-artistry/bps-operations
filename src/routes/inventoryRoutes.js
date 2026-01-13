const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.post('/category', verifyToken, isAdmin, inventoryController.createInventoryCategory);
router.get('/category', verifyToken, isAdmin, inventoryController.getAllInventoryCategories);
router.delete('/category/:id', verifyToken, isAdmin, inventoryController.deleteInventoryCategory);

module.exports = router;