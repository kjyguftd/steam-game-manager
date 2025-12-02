const https = require('https'); // 使用内置的 https 模块
const url = require('url');

// ⚠️ 最佳实践：将此 Key 存储为环境变量！
// const STEAM_API_KEY = '5220F08CD26B1283651F52770FFF0044';

let userStore;
try {
    userStore = require('./userStore.js'); // 如果项目存在 userStore，则用于按 userId 查询 apiKey
} catch (e) {
    userStore = null;
}

// 定义一个自定义错误类用于配置缺失
/**
 * 自定义错误类型，用于指示缺少配置，前端可识别并提示用户输入。
 * @param {string} message
 */
class MissingConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MissingConfigurationError';
        // 增加一个自定义的 code 或 flag 方便前端识别
        this.errorCode = 'E_MISSING_STEAM_API_KEY';
        this.configItem = 'Steam API Key';
    }
}


const STEAM_API_BASE = 'api.steampowered.com';
const OWNED_GAMES_PATH = '/IPlayerService/GetOwnedGames/v0001/';

/**
 * 尝试解析 apiKey：优先使用传入值 -> 环境变量 -> userStore（若给出 userId 且实现了 getApiKey(userId)）
 */
function resolveApiKey(maybeApiKeyOrOpts) {
    // 处理直接传 apiKey 字符串的情况
    if (typeof maybeApiKeyOrOpts === 'string' && maybeApiKeyOrOpts.trim()) {
        return maybeApiKeyOrOpts.trim();
    }

    // 处理传入对象 { apiKey, userId } 的情况
    if (maybeApiKeyOrOpts && typeof maybeApiKeyOrOpts === 'object') {
        if (maybeApiKeyOrOpts.apiKey && typeof maybeApiKeyOrOpts.apiKey === 'string') {
            return maybeApiKeyOrOpts.apiKey.trim();
        }

        const userId = maybeApiKeyOrOpts.userId;
        if (userId) {
            // 优先使用 userStore（如果存在）
            if (userStore && typeof userStore.getApiKey === 'function') {
                try {
                    const k = userStore.getApiKey(userId);
                    if (k && typeof k === 'string') return k.trim();
                } catch (e) {
                    // 忽略并继续回退
                }
            }

            // 回退读取 server/users.json
            try {
                // 确保只有在需要时才 require fs 和 path
                const fs = require('fs');
                const path = require('path');
                const usersPath = path.join(__dirname, '..', 'users.json'); // 从 server 目录上一级查找 users.json

                if (fs.existsSync(usersPath)) {
                    const raw = fs.readFileSync(usersPath, 'utf8');
                    const usersData = JSON.parse(raw);

                    const findUser = (arrOrObj) => {
                        if (Array.isArray(arrOrObj)) {
                            return arrOrObj.find(u => u && (u.id === userId || String(u.id) === String(userId)));
                        }
                        if (arrOrObj && typeof arrOrObj === 'object') {
                            // 支持两种结构：{ userId: {...} } 或 单个对象/映射
                            if (arrOrObj[userId]) return arrOrObj[userId];
                            return Object.values(arrOrObj).find(u => u && (u.id === userId || String(u.id) === String(userId)));
                        }
                        return null;
                    };

                    const user = findUser(usersData);
                    if (user) {
                        if (user["steamApiKey"] && typeof user["steamApiKey"] === 'string' && user["steamApiKey"].trim()) {
                            return user["steamApiKey"].trim();
                        }
                    }
                }
            } catch (e) {
                // 读取/解析失败则继续回退
            }
        }
    }

    // 环境变量
    if (process.env.STEAM_API_KEY && process.env.STEAM_API_KEY.trim()) {
        return process.env.STEAM_API_KEY.trim();
    }
    return null;
}

/**
 * 从 Steam Web API 获取拥有的游戏列表，并转换成前端期望的字段：
 * [{ appId, name, playtimeMinutes, imgUrls: [...] }, ...]
 *
 * @param {string} steamId64
 * @param {string|object} maybeApiKeyOrOpts - 可为 apiKey 字符串，或 { apiKey, userId }
 * @param {number} timeoutMs - 可选，默认 10000ms
 * @returns {Promise<Array>}
 */
const getOwnedGames = (steamId64, maybeApiKeyOrOpts = null, timeoutMs = 10000) => {
    return new Promise((resolve, reject) => {
        if (!steamId64) return reject(new Error('steamId64 required'));

        const apiKey = resolveApiKey(maybeApiKeyOrOpts);
        if (!apiKey) {
            // 当没有 API Key 时，抛出自定义错误，通知前端显示输入框
            return reject(new MissingConfigurationError('Steam API Key is not configured.'));
        }

        const params = new URLSearchParams({
            key: apiKey,
            steamid: steamId64,
            format: 'json',
            include_appinfo: '1',
            include_played_free_games: '1'
        });

        const options = {
            hostname: STEAM_API_BASE,
            path: `${OWNED_GAMES_PATH}?${params.toString()}`,
            method: 'GET',
            timeout: timeoutMs
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode !== 200) {
                    // 返回包含状态码，便于定位
                    return reject(new Error(`Steam API failed with status: ${res.statusCode}`));
                }

                try {
                    const json = JSON.parse(data);
                    const games = (json && json.response && Array.isArray(json.response.games)) ? json.response.games : [];

                    // 转换字段，前端使用 appId, name, playtimeMinutes
                    const mapped = games.map(g => ({
                        appId: g.appid,
                        name: g.name || g.title || '',
                        playtimeMinutes: Number.isFinite(g.playtime_forever) ? g.playtime_forever : (g.playtime_forever === 0 ? 0 : (g.playtime || 0)),
                        imgUrls: [
                            `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
                            `https://steamcdn-a.akamaihd.net/steam/apps/${g.appid}/header.jpg`,
                            `https://cdn.akamai.steamstatic.com/steam/apps/${g.appid}/header.jpg`
                        ]
                    }));

                    resolve(mapped);
                } catch (e) {
                    reject(new Error('Invalid JSON response from Steam API.'));
                }
            });
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Steam API request timed out'));
        });

        req.on('error', (e) => {
            reject(new Error(`Could not connect to Steam API: ${e.message}`));
        });

        req.end();
    });
};

module.exports = {
    getOwnedGames,
    MissingConfigurationError // 导出自定义错误类，方便调用者检查
};