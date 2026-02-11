require('dotenv').config();
const http = require('http');
const socketUtil = require('./utils/socket'); 

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
const reportRoutes = require('./routes/reportRoutes');
const systemRoutes = require('./routes/systemRoutes'); 

const app = express();
const PORT = process.env.port || 3000;

// 2. CREATE HTTP SERVER
const server = http.createServer(app);

// 3. INITIALIZE SOCKET
const io = socketUtil.init(server);

io.on('connection', (socket) => {
    console.log('Client connected: ' + socket.id);
});

// Middlewares
app.use(express.json());
if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    console.log(`Serving uploads from Volume: ${process.env.RAILWAY_VOLUME_MOUNT_PATH}/uploads`);
    app.use('/uploads', express.static(path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads')));
} else {
    // Local development fallback
    app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
}
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
app.use('/api/reports', reportRoutes);
app.use('/api/system', systemRoutes);


cron.schedule('0 8 * * *', () => {
    checkExpiringDocuments();
}, {
    scheduled: true,
    timezone: "Asia/Manila"
});

console.log("Scheduled document checker to run daily at 8:00 AM.");

// Initial Routes
server.listen(PORT, '0.0.0.0', () => { // '0.0.0.0' allows access from phone
    console.log(`Server running at http://localhost:${PORT}`);
});