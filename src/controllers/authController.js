const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logAudit = require('../utils/audit-logger');
const { all, get, run } = require('../utils/db-async');

const login = async (req, res) => {
    try {

        // Get the credentials
        const { email, password } = req.body;

        // 1. VALIDATE
        if(!email || !password) {
            return res.status(400).json({success:false,data:"Email and password are required."});
        }

        // 2. CHECK IF USER EXISTS
        const user = await get("SELECT * FROM users WHERE email = ?", [email]);

        if(!user) {
            return res.status(401).json({success:false,data:"Invalid email or password."});
        }

        // 3. CHECK IF ACCOUNT IS ACTIVE
        if(user.is_active === 0) {
            return res.status(403).json({success:false,data:"Account is currently disabled. Contact admin."});
        }

        // 4. COMPARE PASSWORDS
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if(!isMatch) {
            return res.status(401).json({success:false,data:"Invalid email or password."})
        }

        // 5. GENERATE JWT TOKEN
        const token = jwt.sign(
            {id: user.id, email: user.email, role_id: user.role_id },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '8h' }
        )

        // 6. RECORD IN AUDTO LOG
        await run(`
            INSERT INTO audit_logs (user_id, action_type, table_name, description, ip_address)
            VALUES (?, ?, ?, ?, ?)    
        `, [user.id, "LOGIN", "users", "User logged in successfully", req.ip])

        // 7. RESPONSE
        res.status(200).json({
            success:true,
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
        })

    } catch(error) {
        console.error("LOGIN ERROR: ", error);
        res.status(500).json({success:false,data:`Internal Server Error: ${error}`})
    }
}

const getAllUsers = async (req, res) => {
    try {
        const users = await all(`
            SELECT id, username, email, role_id, is_active FROM users    
        `)

        res.status(200).json({success:true,data:users})
    } catch(err) {
        res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`})
    }
}

const createUser = async (req, res) => {
    try {
        const { username, email, password, role_id } = req.body;

        // 1. CHECK EXISTENCE
        if(!username || !email || !password || !role_id) {
            return res.status(400).json({success:false,data:"All fields are required."})
        }

        // 2. CHECK PASSWORD LENGTH
        if(password.length < 8) {
            return res.status(400).json({success:false,data:"Password must be at least 8 characters long."})
        }

        // 3. CHECK EMAIL FORMAT
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)) {
            return res.status(400).json({success:false,data:"Invalid email format."})
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const result = await run(`
            INSERT INTO users (username, email, password_hash, role_id, is_active)
            VALUES (?, ?, ?, ?, 1)
        `, [username, email, hash, role_id])

        await logAudit(req.user.id, 'CREATE', 'users', result.lastID, `Created user ${username}`, req.ip);

        res.status(201).json({success:true,data:"User created successfully", id: result.lastID})
    } catch(err) {
        return res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`})
    }
}

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        let { username, password, email, role_id, is_active } = req.body;

        if(!password) {
            password = null;
        } else {
            const salt = await bcrypt.genSalt(10);
            password = await bcrypt.hash(password, salt);
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
        `, [username, password, email, role_id, is_active, id])

        await logAudit(req.user.id, 'UPDATE', 'users', id, `Updated profile for user ID:${id}`, req.ip);

        return res.status(200).json({success:true,data:"User updated successfully!"})
    } catch(err) {
        return res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`})
    }
}

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        await run(`
            DELETE FROM users WHERE id = ?  
        `, [id])

        await logAudit(req.user.id, 'DELETE', 'users', id, `Deleted user ID: ${id}`, req.ip);

        return res.status(200).json({success:true,data:"User deleted successfully!"})
    } catch(err) {
        return res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`})
    }
}

const getUser = async(req, res) => {
    try {
        const { id } = req.params;
        const user = await get(`
            SELECT id, username, email, role_id, is_active, created_at FROM users
            WHERE id = ?    
        `, [id])

        res.status(200).json({success:true,data:user})
    } catch(err) {
        res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`})
    }
}

const disableUser = async (req, res) => {
    try {
        const { id } = req.params;

        await run(`
            UPDATE users
            SET
                is_active = 0
            WHERE id = ?    
        `, [id])

        await logAudit(req.user.id, 'UPDATE', 'users', id, `Disabled user ID: ${id}`, req.ip);

        return res.status(200).json({success:true,data:"User disabled successfully!"})
    } catch(err) {
        return res.status(500).json({success:false,data:`Internal Server Error: ${err.message}`})
    }
}

const checkSession = (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            user: req.user
        }
    });
};

module.exports = { login, getAllUsers, createUser, updateUser, deleteUser, getUser, disableUser, checkSession }