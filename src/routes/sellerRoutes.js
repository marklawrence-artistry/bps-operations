const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.post('/', verifyToken, upload.single('image'), sellerController.createSeller);

module.exports = router;