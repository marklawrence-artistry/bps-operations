require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { db, initDB } = require('./database');
const path = require('path');

if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined.");
    process.exit(1);
}

// Routes
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

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

// Initial Routes
app.listen(PORT, () => {
    console.log(`The port is listening at http://localhost:${PORT}`);
})