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
router.put('/enable/:id', verifyToken, isAdmin, authController.enableUser);
router.delete('/:id', verifyToken, isAdmin, authController.deleteUser);

router.post('/forgot-password', authController.getSecurityQuestion);
router.post('/reset-password', authController.resetPassword);

router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;