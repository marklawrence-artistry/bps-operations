const crypto = require('crypto');
const IV_LENGTH = 16;

// Derive a secure 32-byte key using the JWT secret so we don't need a separate ENV variable
function getDerivedKey() {
    return crypto.scryptSync(process.env.JWT_SECRET || 'fallback_secret', 'salt', 32);
}

// For DB Text (Sellers)
function encryptText(text) {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', getDerivedKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decryptText(text) {
    if (!text) return text;
    try {
        const textParts = text.split(':');
        if (textParts.length !== 2) return text; // Fallback for old unencrypted data
        const iv = Buffer.from(textParts[0], 'hex');
        const encryptedText = Buffer.from(textParts[1], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', getDerivedKey(), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return text; // Fallback if decryption fails
    }
}

// For Files (Documents)
function encryptBuffer(buffer) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', getDerivedKey(), iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
}

function decryptBuffer(buffer) {
    const iv = buffer.slice(0, IV_LENGTH);
    const encryptedText = buffer.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-cbc', getDerivedKey(), iv);
    return Buffer.concat([decipher.update(encryptedText), decipher.final()]);
}

module.exports = { encryptText, decryptText, encryptBuffer, decryptBuffer };