const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const DB_SOURCE = "bps.db";

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if(err) {
        console.log(err.message);
    }
})

const initDB = () => {
    db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON;', (err) => {
            if(err) {
                console.log(err.message);
            }
        })
        
        // 1. Roles Management
        db.run(`
                CREATE TABLE IF NOT EXISTS roles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE, -- 'Admin', 'Staff'
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `, (err) => {
            if(err) {
                console.log(`ERROR CREATING roles TABLE: ${err.message}`);
            } else {
                console.log(`roles TABLE CREATED SUCCESSFULLY/ALREADY EXISTS.`)
            }
        })

        // 2. Users Management
        db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    role_id INTEGER,
                    is_active INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (role_id) REFERENCES roles(id)
                );
            `, (err) => {
            if(err) {
                console.log(`ERROR CREATING users TABLE: ${err.message}`);
            } else {
                console.log(`users TABLE CREATED SUCCESSFULLY/ALREADY EXISTS.`)
            }
        })

        // 3. Inventory Categories Management
        db.run(`
                CREATE TABLE IF NOT EXISTS inventory_categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    staff_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (staff_id) REFERENCES users(id)
                );
            `, (err) => {
            if(err) {
                console.log(`ERROR CREATING inventory_categories TABLE: ${err.message}`);
            } else {
                console.log(`inventory_categories TABLE CREATED SUCCESSFULLY/ALREADY EXISTS.`)
            }
        })

        // 4. Inventory Management
        db.run(`
                CREATE TABLE IF NOT EXISTS inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    category_id INTEGER,
                    quantity INTEGER DEFAULT 0,
                    min_stock_level INTEGER DEFAULT 5,
                    image_url TEXT,
                    staff_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES inventory_categories(id),
                    FOREIGN KEY (staff_id) REFERENCES users(id)
                );
            `, (err) => {
            if(err) {
                console.log(`ERROR CREATING inventory TABLE: ${err.message}`);
            } else {
                console.log(`inventory TABLE CREATED SUCCESSFULLY/ALREADY EXISTS.`)
            }
        })

        // 5. Sellers Management
        db.run(`
                CREATE TABLE IF NOT EXISTS seller (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    category TEXT,
                    contact_num TEXT,
                    email TEXT,
                    image_path TEXT,
                    platform_name TEXT,
                    staff_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (staff_id) REFERENCES users(id)
                );
            `, (err) => {
            if(err) {
                console.log(`ERROR CREATING seller TABLE: ${err.message}`);
            } else {
                console.log(`seller TABLE CREATED SUCCESSFULLY/ALREADY EXISTS.`)
            }
        })

        // 6. Returned-to-Seller Record Keeping Management
        db.run(`
                CREATE TABLE IF NOT EXISTS rts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    seller_id INTEGER,
                    customer_name TEXT,
                    tracking_no TEXT NOT NULL,
                    product_name TEXT,
                    description TEXT, -- Reason for return
                    status TEXT DEFAULT 'pending', -- 'pending', 'returned_to_seller'
                    staff_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (seller_id) REFERENCES seller(id),
                    FOREIGN KEY (staff_id) REFERENCES users(id)
                );
            `, (err) => {
            if(err) {
                console.log(`ERROR CREATING rts TABLE: ${err.message}`);
            } else {
                console.log(`rts TABLE CREATED SUCCESSFULLY/ALREADY EXISTS.`)
            }
        })

        // 7. Weekly Sales Management
        db.run(`
                CREATE TABLE IF NOT EXISTS weekly_sales (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    week_start_date TEXT NOT NULL, -- Stored as YYYY-MM-DD
                    week_end_date TEXT NOT NULL,   -- Stored as YYYY-MM-DD
                    total_amount DECIMAL(10, 2) NOT NULL,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `, (err) => {
            if(err) {
                console.log(`ERROR CREATING weekly_sales TABLE: ${err.message}`);
            } else {
                console.log(`weekly_sales TABLE CREATED SUCCESSFULLY/ALREADY EXISTS.`)
            }
        })

        // 8. Documents Management
        db.run(`
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    category TEXT, -- 'Business Permit', 'Fire Safety'
                    expiry_date TEXT NOT NULL, -- YYYY-MM-DD
                    file_path TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `, (err) => {
            if(err) {
                console.log(`ERROR CREATING documents TABLE: ${err.message}`);
            } else {
                console.log(`documents TABLE CREATED SUCCESSFULLY/ALREADY EXISTS.`)
            }
        })
        
        // 9. Notification Logs Management
        db.run(`
                CREATE TABLE IF NOT EXISTS notification_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    document_id INTEGER,
                    trigger_type TEXT, -- '30_day_warning', '7_day_warning', 'expired'
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id)
                );
            `, (err) => {
            if(err) {
                console.log(`ERROR CREATING notification_logs TABLE: ${err.message}`);
            } else {
                console.log(`notification_logs TABLE CREATED SUCCESSFULLY/ALREADY EXISTS.`)
            }
        })

        // 9. Audit Logs Management
        db.run(`
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER, -- HINDI FOREIGN KEY kase in case na deleted na yung user
                    action_type TEXT, -- 'LOGIN', 'CREATE', 'UPDATE', 'DELETE'
                    table_name TEXT,  -- 'inventory', 'seller', etc.
                    record_id INTEGER, -- Which ID was modified
                    description TEXT, -- 'Changed quantity of Bubble Wrap from 50 to 40'
                    ip_address TEXT, 
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `, (err) => {
            if(err) {
                console.log(`ERROR CREATING audit_logs TABLE: ${err.message}`);
            } else {
                console.log(`audit_logs TABLE CREATED SUCCESSFULLY/ALREADY EXISTS.`)
            }
        })


        // Add initial admin account
        // Pang CREATE din ng account to
        async function seedAdmin() {
            const password = "Admin123!";
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            db.run(`INSERT OR IGNORE INTO roles (id, name) VALUES (1, 'Admin')`);
            db.run(`INSERT OR IGNORE INTO roles (id, name) VALUES (2, 'Staff')`);

            db.run(`
                INSERT OR IGNORE INTO users (username, email, password_hash, role_id, is_active)
                VALUES ('admin', 'admin@bps.com', ?, 1, 1)
            `, [hash], (err) => {
                if(err) {
                    console.error(err.message);
                } else {
                    console.log("Admin account created! Email admin@bps.com, Password: " + password);
                }
            })
        }
        seedAdmin();
    })
}

module.exports = { db, initDB }