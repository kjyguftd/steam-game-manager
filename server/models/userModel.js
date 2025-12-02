const { readJsonFile, writeJsonFile } = require('../utils/fileUtils.js');
const crypto = require('crypto'); // 用于生成 ID
// 📌 修正点 1: 导入加密和加密存储工具
const { encrypt } = require('../utils/crypto.js');
const { saveEncryptedApiKey } = require('../utils/userStore.js');

const USER_FILE = 'users.json';

/**
 * 根据用户名查找用户
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
const findUserByUsername = async (username) => {
    const users = await readJsonFile(USER_FILE);
    // 修正: users 可能不是数组，需要检查
    if (!Array.isArray(users)) return null;
    return users.find(user => user.username === username);
};

/**
 * 根据用户ID查找用户
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const findUserById = async (userId) => {
    const users = await readJsonFile(USER_FILE);
    if (!Array.isArray(users)) return null;
    return users.find(user => user.id === userId);
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

/**
 * 保存用户的 Steam API Key (现在使用加密存储)
 * @param {string} userId
 * @param {string} apiKey
 * @returns {Promise<boolean>}
 */
const saveSteamApiKey = async (userId, apiKey) => {
    // 使用加密函数，并通过 userStore 存储加密后的对象
    try {
        const encryptedKey = encrypt(apiKey);
        // saveEncryptedApiKey 负责找到用户并将加密对象存储在 encryptedApiKey 字段中
        await saveEncryptedApiKey(userId, encryptedKey);
        return true;
    } catch (e) {
        // 如果找不到用户或加密失败，则返回 false
        console.error('Error saving encrypted API key in userModel:', e);
        // 这里只是简单返回 false，实际 userStore.js 内部逻辑可能需要处理用户不存在
        return false;
    }
};

module.exports = {
    findUserByUsername,
    createUser,
    saveSteamApiKey,
    findUserById
};