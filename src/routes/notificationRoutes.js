const express = require('express');
const router = express.Router();
const { checkExpiringDocuments } = require('../services/notificationService');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/test-run', verifyToken, isAdmin, async (req, res) => {
    try {
        console.log("Manual trigger of notification check initiated by admin.");
        // Capture the result
        const result = await checkExpiringDocuments(true);
        
        if (result && result.count === 0) {
            res.status(200).json({ success: true, data: "0 documents found in the database. No email was sent." });
        } else {
            res.status(200).json({ success: true, data: "Notification check completed. Check your inbox." });
        }
    } catch (error) {
        // LOG THE REAL ERROR HERE
        console.error("TEST RUN CRASHED:", error);
        res.status(500).json({ 
            success: false, 
            data: error.message || "Unknown error",
            details: error.response ? error.response.body : "No API response"
        });
    }
});

module.exports = router;