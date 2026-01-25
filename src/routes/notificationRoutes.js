const express = require('express');
const router = express.Router();
const { checkExpiringDocuments } = require('../services/notificationService');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// This route is for manually triggering the notification check for testing purposes.
router.get('/test-run', verifyToken, isAdmin, async (req, res) => {
    try {
        console.log("Manual trigger of notification check initiated by admin.");
        await checkExpiringDocuments();
        res.status(200).json({ success: true, data: "Notification check completed. Check console and email for results." });
    } catch (error) {
        res.status(500).json({ success: false, data: "An error occurred during the test run." });
    }
});

module.exports = router;