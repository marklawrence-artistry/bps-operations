require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { db, initDB } = require('./database');
const path = require('path');
const cron = require('node-cron');
const { checkExpiringDocuments } = require('./services/notificationService');

if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1);
}

// Routes
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const rtsRoutes = require('./routes/rtsRoutes');
const salesRoutes = require('./routes/salesRoutes');
const documentRoutes = require('./routes/documentRoutes');
const auditRoutes = require('./routes/auditRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.port || 3000;

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(cors());

// Initialize Database
initDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/rts', rtsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);


cron.schedule('0 8 * * *', () => {
    checkExpiringDocuments();
}, {
    scheduled: true,
    timezone: "Asia/Manila"
});

console.log("Scheduled document checker to run daily at 8:00 AM.");

// Initial Routes
app.listen(PORT, () => {
    console.log(`The port is listening at http://localhost:${PORT}`);
})