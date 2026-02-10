const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logAudit = require('../utils/audit-logger');
const { all, get, run } = require('../utils/db-async');
const { getIO } = require('../utils/socket');

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
        let query = `SELECT id, username, email, role_id, is_active FROM users WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) as count FROM users WHERE 1=1`;
        let params = [];

        // Add Search Condition
        if (search) {
            const searchSQL = ` AND (username LIKE ? OR email LIKE ?)`;
            query += searchSQL;
            countQuery += searchSQL;
            params.push(`%${search}%`, `%${search}%`);
        }

        // Add Role Filter
        if (req.query.role) {
            query += ` AND role_id = ?`;
            countQuery += ` AND role_id = ?`;
            params.push(req.query.role);
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
        const { username, email, password, role_id, security_question, security_answer } = req.body;

        if (!username || !email || !password || !role_id) {
            return res.status(400).json({ success: false, data: "Fields required." });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        
        // Hash the answer if provided
        let answerHash = null;
        if (security_answer) {
            answerHash = await bcrypt.hash(security_answer, salt);
        }

        const result = await run(`
            INSERT INTO users (username, email, password_hash, role_id, is_active, security_question, security_answer_hash)
            VALUES (?, ?, ?, ?, 1, ?, ?)
        `, [username, email, hash, role_id, security_question, answerHash]);

        await logAudit(req.user.id, 'CREATE', 'users', result.lastID, `Created user ${username}`, req.ip);
        getIO().emit('account_update');
        res.status(201).json({ success: true, data: "User created.", id: result.lastID });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        let { username, password, email, role_id, is_active, security_question, security_answer } = req.body;

        // Prepare Password Hash
        let passwordHash = null;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        // Prepare Answer Hash
        let answerHash = null;
        if (security_answer) {
            const salt = await bcrypt.genSalt(10);
            answerHash = await bcrypt.hash(security_answer, salt);
        }

        // We use COALESCE in SQL, but since we are constructing a dynamic update, simpler SQL is better here
        // However, to keep it consistent with previous style:
        await run(`
            UPDATE users
            SET
                username = COALESCE(?, username),
                password_hash = COALESCE(?, password_hash),
                email = COALESCE(?, email),
                role_id = COALESCE(?, role_id),
                is_active = COALESCE(?, is_active),
                security_question = COALESCE(?, security_question),
                security_answer_hash = COALESCE(?, security_answer_hash)
            WHERE id = ?
        `, [username, passwordHash, email, role_id, is_active, security_question, answerHash, id]);

        await logAudit(req.user.id, 'UPDATE', 'users', id, `Updated user ID:${id}`, req.ip);
        getIO().emit('account_update');
        res.status(200).json({ success: true, data: "User updated." });
    } catch (err) {
        res.status(500).json({ success: false, data: `Error: ${err.message}` });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await run(`DELETE FROM users WHERE id = ?`, [id]);
        await logAudit(req.user.id, 'DELETE', 'users', id, `Deleted user ID: ${id}`, req.ip);
        getIO().emit('account_update');
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

// NEW: Get Security Question by Email (Public)
const getSecurityQuestion = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await get(`SELECT security_question FROM users WHERE email = ?`, [email]);
        
        if (!user) return res.status(404).json({ success: false, data: "Email not found." });
        if (!user.security_question) return res.status(400).json({ success: false, data: "No security question set for this account." });

        res.status(200).json({ success: true, data: user.security_question });
    } catch (err) {
        res.status(500).json({ success: false, data: err.message });
    }
};

// NEW: Reset Password (Public)
const resetPassword = async (req, res) => {
    try {
        const { email, answer, newPassword } = req.body;
        
        const user = await get(`SELECT id, security_answer_hash FROM users WHERE email = ?`, [email]);
        if (!user) return res.status(404).json({ success: false, data: "User not found." });

        const isMatch = await bcrypt.compare(answer, user.security_answer_hash);
        if (!isMatch) return res.status(401).json({ success: false, data: "Incorrect answer." });

        if (newPassword.length < 8) return res.status(400).json({ success: false, data: "Password too short." });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await run(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, user.id]);
        
        // Log this action (System action, so user_id is the user themselves)
        await logAudit(user.id, 'UPDATE', 'users', user.id, 'Password reset via security question', req.ip);

        res.status(200).json({ success: true, data: "Password reset successful." });
    } catch (err) {
        res.status(500).json({ success: false, data: err.message });
    }
};

// NEW: Change Password (Logged In User)
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, data: "Both old and new passwords are required." });
        }

        // Get current user password hash
        const user = await get(`SELECT password_hash FROM users WHERE id = ?`, [userId]);
        
        // Verify Old Password
        const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isMatch) return res.status(401).json({ success: false, data: "Incorrect old password." });

        // Hash New Password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        // Update DB
        await run(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, userId]);
        
        // Log Audit
        await logAudit(userId, 'UPDATE', 'users', userId, 'Changed own password', req.ip);

        res.status(200).json({ success: true, data: "Password changed successfully." });
    } catch (err) {
        res.status(500).json({ success: false, data: err.message });
    }
};

module.exports = { 
    login, getAllUsers, createUser, updateUser, deleteUser, getUser, disableUser, enableUser, checkSession, 
    getSecurityQuestion, resetPassword, changePassword
}