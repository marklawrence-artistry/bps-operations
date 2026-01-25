const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.get('/', verifyToken, documentController.getAllDocuments);
router.post('/', verifyToken, upload.single('document'), documentController.createDocument); // Expects form field 'document'
router.put('/:id', verifyToken, documentController.updateDocument);
router.delete('/:id', verifyToken, documentController.deleteDocument);

module.exports = router;