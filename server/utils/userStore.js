// server/utils/userStore.js

const fs = require('fs');
const path = require('path');
// 引入 util 模块，用于 promisify fs 函数
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json'); // 修正路径到 data 目录
let _cache = null;
let _mtime = 0;

// --- 异步文件操作（用于写入）---

async function _loadAllAsync() {
    try {
        const raw = await readFile(USERS_PATH, 'utf8');
        // 如果文件为空，返回空数组，与 fileUtils.js 保持一致
        return JSON.parse(raw || '[]');
    } catch (e) {
        if (e.code === 'ENOENT') {
            return [];
        }
        console.error('Error loading users asynchronously:', e);
        return [];
    }
}

async function _saveAllAsync(data) {
    const dir = path.dirname(USERS_PATH);
    await mkdir(dir, { recursive: true });
    await writeFile(USERS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// --- 同步缓存读取（用于快速获取和认证）---

function loadAllSync() {
    try {
        if (!fs.existsSync(USERS_PATH)) return [];
        const stat = fs.statSync(USERS_PATH);
        if (_cache && stat.mtimeMs === _mtime) return _cache;

        const raw = fs.readFileSync(USERS_PATH, 'utf8');
        const parsed = JSON.parse(raw || '[]');

        _cache = parsed;
        _mtime = stat.mtimeMs;
        return _cache;
    } catch (e) {
        console.error('Error loading users synchronously:', e);
        return [];
    }
}

/**
 * 核心查找函数：根据用户 ID 查找单个用户
 * 📌 修正点 1: 实现一个可靠的 findUserById 函数
 * @param {string} userId
 * @returns {Object|null}
 */
function findUserById(userId) {
    if (userId === undefined || userId === null) return null;
    const usersData = loadAllSync(); // 获取所有用户数据

    // 强制转换为字符串进行比较，确保与 JSON 中的 string ID 匹配
    const uid = String(userId);

    if (Array.isArray(usersData)) {
        return usersData.find(u => u && u.id === uid);
    }
    // 如果 usersData 是一个对象映射 (非数组)，则尝试查找
    if (typeof usersData === 'object' && usersData !== null) {
        // 如果数据已经是 { userId: { userObj } } 格式 (虽然不推荐)
        if (usersData[uid]) return usersData[uid];
        // 如果数据是 { userObj1, userObj2 } 格式，遍历值
        return Object.values(usersData).find(u => u && u.id === uid);
    }
    return null;
}

/**
 * 异步保存单个用户记录
 * 📌 修正点 2: 适应 users.json 的数组格式，查找并替换/更新用户
 * @param {string} userId
 * @param {Object} updates - 要合并到用户对象中的新字段
 */
async function saveUserUpdates(userId, updates) {
    const allUsers = await _loadAllAsync();
    const uid = String(userId);
    const userIndex = allUsers.findIndex(u => u.id === uid);

    if (userIndex === -1) {
        // 如果找不到用户，抛出错误让上层捕获
        throw new Error('User not found for update.');
    }

    // 更新用户对象
    allUsers[userIndex] = { ...allUsers[userIndex], ...updates };

    // 保存回文件
    await _saveAllAsync(allUsers);

    // 清空缓存，确保下次读取是新的
    _cache = null;
}


/**
 * 异步保存加密 API Key
 * @param {string} userId
 * @param {Object} encryptedObj
 */
async function saveEncryptedApiKey(userId, encryptedObj) {
    // 📌 修正点 3: 调用新的 saveUserUpdates 函数
    // 存储在 encryptedApiKey 字段中
    await saveUserUpdates(userId, { encryptedApiKey: encryptedObj });
}

/**
 * 异步获取加密 API Key
 * @param {string} userId
 * @returns {Object|null}
 */
async function getEncryptedApiKey(userId) {
    // 📌 修正点 4: 调用新的 findUserById 函数
    const user = findUserById(userId);
    return user ? user.encryptedApiKey || null : null;
}

/**
 * 返回用户的 API Key（同步）
 * @param {string|number} userId
 * @returns {string|null}
 */
function getApiKey(userId) {
    if (userId === undefined || userId === null) return null;
    const user = findUserById(userId);
    if (!user) return null;

    // 假设用户可能仍然存储了未加密的 steamApiKey (旧格式)
    const candidates = ['apiKey', 'steamApiKey', 'steam_api_key', 'steam_key', 'key', 'steamKey'];
    for (const name of candidates) {
        if (user[name] && typeof user[name] === 'string' && user[name].trim()) {
            return user[name].trim();
        }
    }
    return null;
}

module.exports = {
    findUserById, // 导出新的查找函数
    saveEncryptedApiKey,
    getEncryptedApiKey,
    getApiKey,
};