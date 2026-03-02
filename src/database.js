const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_NAME = "bps.db";
const DB_SOURCE = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, DB_NAME) 
    : path.resolve(__dirname, '../', DB_NAME);

// Container for the database object
let dbInstance = null;

const connectDB = () => {
    return new sqlite3.Database(DB_SOURCE, (err) => {
        if(err) console.error("DB Connection Error:", err.message);
        else console.log("Connected to SQLite database.");
    });
};

// Initialize first connection
dbInstance = connectDB();

// Helper to get the current active connection
const getDB = () => {
    if (!dbInstance) dbInstance = connectDB();
    return dbInstance;
};

// Helper to Hot-Reload the DB (Close old, Open new)
const reloadDB = async () => {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            console.log("Closing old database connection...");
            dbInstance.close((err) => {
                if (err) console.error("Error closing DB:", err.message);
                
                console.log("Opening new database connection...");
                dbInstance = connectDB();
                
                // Re-enable foreign keys on new connection
                dbInstance.serialize(() => {
                    dbInstance.run('PRAGMA foreign_keys = ON;', (err) => {
                        if(err) reject(err);
                        else resolve();
                    });
                });
            });
        } else {
            dbInstance = connectDB();
            resolve();
        }
    });
};

const initDB = () => {
    const db = getDB();
    db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON;');
        db.run('PRAGMA journal_mode = WAL;');
        
        // 1. Roles
        db.run(`CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

        // 2. Users
        db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role_id INTEGER, is_active INTEGER NOT NULL, security_question TEXT, security_answer_hash TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (role_id) REFERENCES roles(id))`);

        // 3. Settings
        db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
        db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_email', 'admin@bps.com')`);

        // 4. Inventory Categories
        db.run(`CREATE TABLE IF NOT EXISTS inventory_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT, staff_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (staff_id) REFERENCES users(id))`);

        // 5. Inventory
        db.run(`CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, category_id INTEGER, quantity INTEGER DEFAULT 0, min_stock_level INTEGER DEFAULT 5, image_url TEXT, staff_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES inventory_categories(id), FOREIGN KEY (staff_id) REFERENCES users(id))`);

        // 6. Seller
        db.run(`CREATE TABLE IF NOT EXISTS seller (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, contact_num TEXT, email TEXT, image_path TEXT, platform_name TEXT, staff_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (staff_id) REFERENCES users(id))`);

        // 7. RTS
        db.run(`CREATE TABLE IF NOT EXISTS rts (id INTEGER PRIMARY KEY AUTOINCREMENT, seller_id INTEGER, customer_name TEXT, tracking_no TEXT NOT NULL, product_name TEXT, description TEXT, status TEXT DEFAULT 'pending', staff_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (seller_id) REFERENCES seller(id), FOREIGN KEY (staff_id) REFERENCES users(id))`);

        // 8. Weekly Sales
        db.run(`CREATE TABLE IF NOT EXISTS weekly_sales (id INTEGER PRIMARY KEY AUTOINCREMENT, week_start_date TEXT NOT NULL, week_end_date TEXT NOT NULL, total_amount DECIMAL(10, 2) NOT NULL, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

        // 9. Documents
        db.run(`CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT, expiry_date TEXT NOT NULL, file_path TEXT NOT NULL, status TEXT DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

        // 10. Notification Logs
        db.run(`CREATE TABLE IF NOT EXISTS notification_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER, trigger_type TEXT, sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (document_id) REFERENCES documents(id))`);

        // 11. Audit Logs
        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action_type TEXT, table_name TEXT, record_id INTEGER, description TEXT, ip_address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

        // Seed Admin
        async function seedAdmin() {
            const password = "Admin123!";
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            db.serialize(() => {
                db.run(`INSERT OR IGNORE INTO roles (id, name) VALUES (1, 'Admin')`);
                db.run(`INSERT OR IGNORE INTO roles (id, name) VALUES (2, 'Staff')`);
                db.run(`INSERT OR IGNORE INTO users (username, email, password_hash, role_id, is_active) VALUES ('admin', 'admin@bps.com', ?, 1, 1)`, [hash]);
            });
        }
        seedAdmin();
    });
};

module.exports = { getDB, initDB, reloadDB };