const crypto = require('crypto');

const DEV_FALLBACK_SECRET = 'dev-fallback-change-me-REPLACE_BEFORE_COMMIT';

// 优先使用环境变量
let SECRET = process.env.API_KEY_SECRET;

if (!SECRET) {
    if (process.env.NODE_ENV !== 'production') {
        SECRET = DEV_FALLBACK_SECRET;
        console.warn('Warning: API_KEY_SECRET not set — using DEV_FALLBACK_SECRET. Do NOT commit this value.');
    } else {
        // 生产环境必须提供
        throw new Error('Missing required environment variable: API_KEY_SECRET. Aborting startup.');
    }
}

function _getKey() {
    return crypto.createHash('sha256').update(SECRET || '').digest();
}

function encrypt(plaintext) {
    if (!SECRET) throw new Error('Server encryption secret not configured.');
    const iv = crypto.randomBytes(12);
    const key = _getKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag();
    return {
        data: encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
    };
}

function decrypt({ data, iv, tag }) {
    if (!SECRET) throw new Error('Server encryption secret not configured.');
    const key = _getKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    let out = decipher.update(data, 'base64', 'utf8');
    out += decipher.final('utf8');
    return out;
}

module.exports = { encrypt, decrypt };
