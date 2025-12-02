// controllers/authController.js

const userModel = require('../models/userModel.js');
const crypto = require('crypto');
const { createSession, deleteSession } = require('../data/sessions.js');

// 密码加密配置
const HASH_CONFIG = {
    keylen: 64, // 密钥长度
    saltlen: 16, // 盐值长度
    N: 1024, // 迭代次数
    r: 8, // 块大小
    p: 1 // 并行化因子
};

/**
 * 辅助函数：将 Buffer 转换为 Hex 字符串
 */
const bufferToHex = (buffer) => buffer.toString('hex');
const hexToBuffer = (hex) => Buffer.from(hex, 'hex');

// ------------------- 注册 -------------------

const register = async (req, res) => {
    const { username, password, steamId64 } = req.body;

    // 1. 服务端输入验证
    if (!username || !password || !steamId64 || password.length < 6) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Invalid input. Username, password (min 6 chars), and SteamID64 are required.' }));
    }

    // 2. 检查用户是否已存在
    if (await userModel.findUserByUsername(username)) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'User already exists.' }));
    }

    try {
        // 3. 生成盐值和密码哈希
        const salt = crypto.randomBytes(HASH_CONFIG.saltlen);

        const hashedPasswordBuffer = await new Promise((resolve, reject) => {
            crypto.scrypt(password, salt, HASH_CONFIG.keylen, HASH_CONFIG, (err, derivedKey) => {
                if (err) return reject(err);
                resolve(derivedKey);
            });
        });

        const hashedPassword = bufferToHex(hashedPasswordBuffer);
        const saltHex = bufferToHex(salt);

        // 4. 创建用户并存储
        const newUser = await userModel.createUser(username, hashedPassword, saltHex, steamId64); // 确保 createUser 返回 newUser 对象

        // 5. 注册成功：创建会话并设置 HTTP-only Cookie
        const sessionId = createSession(newUser.id); // 使用新用户ID创建会话

        const cookieOptions = [
            `sessionId=${sessionId}`,
            'HttpOnly',
            // 'Secure', // 保持原样
            'Max-Age=3600',
            'Path=/',
            'SameSite=Lax'
        ].join('; ');


        res.writeHead(201, {
            'Content-Type': 'application/json',
            'Set-Cookie': cookieOptions // 设置 Cookie
        });
        // 📌 核心修改：返回 userId，供前端存储在全局变量中
        res.end(JSON.stringify({
            message: 'User created successfully.',
            userId: newUser.id // 返回新用户的 ID
        }));

    } catch (error) {
        console.error('Registration error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Internal Server Error during registration.' }));
    }
};

// ------------------- 登录 -------------------

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Username and password are required.' }));
    }

    const user = await userModel.findUserByUsername(username);

    if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Invalid credentials.' }));
    }

    try {
        // 1. 验证密码
        const saltBuffer = hexToBuffer(user.salt);
        const storedHashedPasswordBuffer = hexToBuffer(user.hashedPassword);

        const inputHashedPasswordBuffer = await new Promise((resolve, reject) => {
            crypto.scrypt(password, saltBuffer, HASH_CONFIG.keylen, HASH_CONFIG, (err, derivedKey) => {
                if (err) return reject(err);
                resolve(derivedKey);
            });
        });

        // 2. 比对哈希值 (使用 crypto.timingSafeEqual 防止时序攻击)
        const passwordMatch = crypto.timingSafeEqual(inputHashedPasswordBuffer, storedHashedPasswordBuffer);

        if (!passwordMatch) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ message: 'Invalid credentials.' }));
        }

        // 3. 登录成功：创建会话并设置 HTTP-only Cookie
        const sessionId = createSession(user.id);

        const cookieOptions = [
            `sessionId=${sessionId}`,
            'HttpOnly',
            // 'Secure',
            'Max-Age=3600',
            'Path=/',
            'SameSite=Lax'
        ].join('; ');

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': cookieOptions
        });
        // 登录响应中已包含 userId: user.id
        res.end(JSON.stringify({ message: 'Login successful.', userId: user.id }));

    } catch (error) {
        console.error('Login error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Internal Server Error during login.' }));
    }
};

// ------------------- 登出 / 认证中间件 -------------------

// 保持 logout 和 authenticate 函数不变

const logout = (req, res) => {
    // 销毁服务器上的会话
    const cookies = require('../data/sessions').parseCookies(req);
    const sessionId = cookies.sessionId;

    if (sessionId) {
        deleteSession(sessionId);
    }

    // 清除客户端 Cookie (通过设置 Max-Age=0)
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': 'sessionId=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax'
    });
    res.end(JSON.stringify({ message: 'Logged out successfully.' }));
};

/**
 * 检查用户是否已登录。如果登录，将 userId 附加到 req.userId
 */
const authenticate = (req, res, next) => {
    const cookies = require('../data/sessions').parseCookies(req);
    const sessionId = cookies.sessionId;

    if (!sessionId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Unauthorized: No session provided.' }));
    }

    const userId = require('../data/sessions').getUserIdBySessionId(sessionId);

    if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Unauthorized: Invalid or expired session.' }));
    }

    req.userId = userId; // 将用户ID附加到请求对象，供后续控制器使用
    next(req, res);
};


module.exports = {
    register,
    login,
    logout,
    authenticate // 导出认证中间件供其他路由使用
};