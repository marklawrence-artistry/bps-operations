const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logAudit = require('../utils/audit-logger');
const { all, get, run } = require('../utils/db-async');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, data: "Email and password are required." });
        }

        const user = await get("SELECT * FROM users WHERE email = ?", [email]);
        if (!user) {
            return res.status(401).json({ success: false, data: "Invalid email or password." });
        }

        if (user.is_active === 0) {
            return res.status(403).json({ success: false, data: "Account is disabled. Contact admin." });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, data: "Invalid email or password." });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role_id: user.role_id }, 
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        await logAudit(user.id, "LOGIN", "users", user.id, "User logged in successfully", req.ip);

        res.status(200).json({
            success: true,
            data: {
                message: "Login successful",
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role_id: user.role_id
                }
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR: ", error);
        res.status(500).json({ success: false, data: `Internal Server Error: ${error.message}` });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || ''; // Get search term
        const offset = (page - 1) * limit;

        // Base Query
        let query = `SELECT id, username, email, role_id, is_active FROM users`;
        let countQuery = `SELECT COUNT(*) as count FROM users`;
        let params = [];

        // Add Search Condition
        if (search) {
            const searchSQL = ` WHERE username LIKE ? OR email LIKE ?`;
            query += searchSQL;
            countQuery += searchSQL;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` LIMIT ? OFFSET ?`;
        const queryParams = [...params, limit, offset];

        const users = await all(query, queryParams);
        const countResult = await get(countQuery, params); // Use only search params for count
        
        const totalItems = countResult.count;
        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            success: true,
            data: users,
            pagination: { current: page, limit, totalItems, totalPages }
        });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const createUser = async (req, res) => {
    try {
        const { username, email, password, role_id } = req.body;

        if (!username || !email || !password || !role_id) {
            return res.status(400).json({ success: false, data: "All fields are required." });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, data: "Password must be at least 8 characters." });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const result = await run(`
            INSERT INTO users (username, email, password_hash, role_id, is_active)
            VALUES (?, ?, ?, ?, 1)
        `, [username, email, hash, role_id]);

        await logAudit(req.user.id, 'CREATE', 'users', result.lastID, `Created user ${username}`, req.ip);

        res.status(201).json({ success: true, data: "User created successfully", id: result.lastID });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        let { username, password, email, role_id, is_active } = req.body;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            password = await bcrypt.hash(password, salt);
        } else {
            password = null; // Let COALESCE handle it
        }

        await run(`
            UPDATE users
            SET
                username = COALESCE(?, username),
                password_hash = COALESCE(?, password_hash),
                email = COALESCE(?, email),
                role_id = COALESCE(?, role_id),
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `, [username, password, email, role_id, is_active, id]);

        await logAudit(req.user.id, 'UPDATE', 'users', id, `Updated user ID:${id}`, req.ip);

        res.status(200).json({ success: true, data: "User updated successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await run(`DELETE FROM users WHERE id = ?`, [id]);
        await logAudit(req.user.id, 'DELETE', 'users', id, `Deleted user ID: ${id}`, req.ip);
        res.status(200).json({ success: true, data: "User deleted successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const getUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await get(`SELECT id, username, email, role_id, is_active, created_at FROM users WHERE id = ?`, [id]);
        if (!user) return res.status(404).json({ success: false, data: "User not found" });
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const disableUser = async (req, res) => {
    try {
        const { id } = req.params;
        await run(`UPDATE users SET is_active = 0 WHERE id = ?`, [id]);
        await logAudit(req.user.id, 'UPDATE', 'users', id, `Disabled user ID: ${id}`, req.ip);
        res.status(200).json({ success: true, data: "User disabled successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const enableUser = async (req, res) => {
    try {
        const { id } = req.params;
        await run(`UPDATE users SET is_active = 1 WHERE id = ?`, [id]);
        await logAudit(req.user.id, 'UPDATE', 'users', id, `Re-enabled user ID: ${id}`, req.ip);
        res.status(200).json({ success: true, data: "User re-enabled successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const checkSession = (req, res) => {
    res.status(200).json({ success: true, data: { user: req.user } });
};

module.exports = { login, getAllUsers, createUser, updateUser, deleteUser, getUser, disableUser, enableUser, checkSession };