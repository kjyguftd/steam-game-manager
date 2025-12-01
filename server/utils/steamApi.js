const https = require('https'); // 使用内置的 https 模块
const url = require('url');

// ⚠️ 最佳实践：将此 Key 存储为环境变量！
const STEAM_API_KEY = '5220F08CD26B1283651F52770FFF0044';

const STEAM_API_BASE = 'api.steampowered.com';
const OWNED_GAMES_PATH = '/IPlayerService/GetOwnedGames/v0001/';

/**
 * 从 Steam Web API 获取用户拥有的游戏列表。
 * @param {string} steamId64 用户的 64 位 Steam ID。
 * @returns {Promise<Array<Object>>} 游戏列表 (AppID, playtime_forever等)。
 */
const getOwnedGames = (steamId64) => {
    return new Promise((resolve, reject) => {
        if (!STEAM_API_KEY) {
            return reject(new Error('Steam API Key is not configured.'));
        }

        // 构造请求参数
        const params = new url.URLSearchParams({
            key: STEAM_API_KEY,           // API Key 在服务器端使用，不会暴露给客户端
            steamid: steamId64,
            format: 'json',
            include_appinfo: 1,           // 包含游戏名称
            include_played_free_games: 1, // 包含免费游戏
        });

        const options = {
            hostname: STEAM_API_BASE,
            path: `${OWNED_GAMES_PATH}?${params.toString()}`,
            method: 'GET',
        };

        const req = https.request(options, (res) => {
            let data = '';

            // 接收数据块
            res.on('data', (chunk) => {
                data += chunk;
            });

            // 数据接收完毕
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.error(`Steam API Error: Status ${res.statusCode}`, data);
                    return reject(new Error(`Steam API failed with status: ${res.statusCode}`));
                }

                try {
                    const json = JSON.parse(data);
                    // 检查响应结构是否包含游戏列表
                    if (json.response && json.response.games) {
                        resolve(json.response.games);
                    } else {
                        // 可能是私有账户或无游戏
                        resolve([]);
                    }
                } catch (e) {
                    console.error('Error parsing Steam API response:', e);
                    reject(new Error('Invalid JSON response from Steam API.'));
                }
            });
        });

        req.on('error', (e) => {
            console.error('HTTPS request error to Steam API:', e);
            reject(new Error(`Could not connect to Steam API: ${e.message}`));
        });

        req.end(); // 发送请求
    });
};

module.exports = {
    getOwnedGames
};