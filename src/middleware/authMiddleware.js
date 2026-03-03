const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // --- NEW: Allow token from query string for protected files ---
    let token = null;
    const authHeader = req.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token; // Grab from URL if loading an image/file
    }

    if(!token) {
        // --- NEW: HTML ERROR PAGE FOR BROWSER REQUESTS ---
        if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return res.status(403).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>403 - Access Denied</title>
                    <style>
                        body { background-color: #f3f4f6; font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                        .container { background: white; padding: 3rem; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; border-top: 5px solid #ef4444; }
                        h1 { color: #111827; margin-bottom: 0.5rem; }
                        p { color: #6b7280; margin-bottom: 2rem; }
                        a { background: #2e3b97; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1 style="color: #ef4444;">Access Denied</h1>
                        <p>You do not have the required security token to view this protected file. Please log in.</p>
                        <a href="/index.html">Return to Login</a>
                    </div>
                </body>
                </html>
            `);
        }
        return res.status(403).json({success:false, data:"No token provided. Access DENIED."});
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({success:false, data:"Invalid or expired token."});
    }
}

// Check if the user is specifically an Admin
const isAdmin = (req, res, next) => {
    if(req.user && req.user.role_id === 1) {
        next(); // Allow
    } else {
        return res.status(403).json({success:false,data:"Access denied."})
    }
}

module.exports = { verifyToken, isAdmin }