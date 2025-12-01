const { readJsonFile, writeJsonFile } = require('../utils/fileUtils');
const crypto = require('crypto'); // 用于生成 ID

const USER_FILE = 'users.json';

/**
 * 根据用户名查找用户
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
const findUserByUsername = async (username) => {
    const users = await readJsonFile(USER_FILE);
    return users.find(user => user.username === username);
};

/**
 * 创建新用户
 * @param {string} username
 * @param {string} hashedPassword
 * @param {string} salt
 * @param {string} steamId64
 * @returns {Promise<Object>} 新创建的用户对象
 */
const createUser = async (username, hashedPassword, salt, steamId64) => {
    const users = await readJsonFile(USER_FILE);

    // 生成一个简单的唯一ID
    const newUser = {
        id: crypto.randomUUID(), // 使用内置 crypto 模块生成 UUID
        username,
        hashedPassword,
        salt,
        steamId64: steamId64, // 存储 SteamID64
    };

    users.push(newUser);
    await writeJsonFile(USER_FILE, users);

    return newUser;
};

// ... 其他用户相关模型函数（如 findUserById）可以在此添加

module.exports = {
    findUserByUsername,
    createUser
};