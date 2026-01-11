const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/me', verifyToken, authController.checkSession);

router.post('/login', authController.login);
router.get('/', verifyToken, isAdmin, authController.getAllUsers);
router.get('/:id', verifyToken, isAdmin, authController.getUser);
router.post('/', verifyToken, isAdmin, authController.createUser);
router.put('/:id', verifyToken, isAdmin, authController.updateUser);

router.put('/disable/:id', verifyToken, isAdmin, authController.disableUser);
router.delete('/:id', verifyToken, isAdmin, authController.deleteUser);

module.exports = router;