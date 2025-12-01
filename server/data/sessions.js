// 这是一个内存中的会话存储
const sessions = {};

/**
 * 创建新会话
 * @param {string} userId
 * @returns {string} sessionId
 */
const createSession = (userId) => {
    const sessionId = crypto.randomUUID();
    // 设置会话过期时间 (例如，1小时后过期)
    const expiration = Date.now() + 60 * 60 * 1000;
    sessions[sessionId] = { userId, expiration };
    return sessionId;
};

/**
 * 查找有效会话
 * @param {string} sessionId
 * @returns {string|null} userId 或 null
 */
const getUserIdBySessionId = (sessionId) => {
    const session = sessions[sessionId];
    if (session && session.expiration > Date.now()) {
        return session.userId;
    }
    // 如果会话过期，清理它
    if (session) {
        delete sessions[sessionId];
    }
    return null;
};

/**
 * 销毁会话
 * @param {string} sessionId
 */
const deleteSession = (sessionId) => {
    delete sessions[sessionId];
};

// 简单的 Cookie 解析函数
const parseCookies = (req) => {
    const cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            if (parts.length === 2) {
                // 去除空格并解码
                cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
            }
        });
    }
    return cookies;
};

module.exports = {
    createSession,
    getUserIdBySessionId,
    deleteSession,
    parseCookies
};