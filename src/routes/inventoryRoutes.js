const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload')

router.post('/category', verifyToken, inventoryController.createInventoryCategory);
router.get('/category', verifyToken, inventoryController.getAllInventoryCategories);
router.delete('/category/:id', verifyToken, inventoryController.deleteInventoryCategory);

router.get('/', verifyToken, inventoryController.getAllInventory);
router.get('/:id', verifyToken, inventoryController.getInventory);
router.post('/', verifyToken, upload.single('image'), inventoryController.createInventory);
router.delete('/:id', verifyToken, inventoryController.deleteInventory);
router.put('/:id', verifyToken, upload.single('image'), inventoryController.updateInventory);


module.exports = router;