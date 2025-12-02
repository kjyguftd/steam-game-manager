const steamApi = require('../utils/steamApi.js');
const { readJsonFile } = require('../utils/fileUtils.js');
const { authenticate } = require('./authController.js');
const { getOwnedGames, MissingConfigurationError } = require('../utils/steamApi.js');
const backlogModel = require('../models/backlogModel.js');
// 📌 修正点 1: 导入解密和加密 Key 获取工具
const { decrypt } = require('../utils/crypto.js');
const { getEncryptedApiKey } = require('../utils/userStore.js');


const USER_FILE = 'users.json';

/**
 * 辅助函数：根据 userId 查找用户的 SteamID64 (仅返回 ID)
 */
const getSteamId64ByUserId = async (userId) => {
    const users = (await readJsonFile(USER_FILE)) || [];
    if (!Array.isArray(users)) return null;
    const user = users.find(u => u.id === userId);
    // 📌 修正 2: 只返回 steamId64
    return user ? user.steamId64 : null;
};

/**
 * 游戏库同步处理函数
 */
const syncLibrary = async (req, res) => {
    const userId = req.userId; // 从认证中间件获取

    try {
        // 1. 获取用户的 SteamID64
        const steamId64 = await getSteamId64ByUserId(userId);
        if (!steamId64) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ message: 'User SteamID64 not found or user not registered correctly.' }));
        }

        // 📌 修正点 3: 显式获取并解密 API Key
        let apiKey;
        try {
            const encryptedKeyObj = await getEncryptedApiKey(userId);
            if (!encryptedKeyObj) {
                // 如果找不到加密 Key，则抛出配置缺失错误，前端将捕获此错误
                throw new MissingConfigurationError('Steam API Key not found for user.');
            }
            apiKey = decrypt(encryptedKeyObj);
        } catch (e) {
            // 捕获解密失败或找不到 Key 的错误，并重新抛出配置缺失错误
            if (e instanceof MissingConfigurationError) throw e;
            // 如果是解密错误 (如密钥配置错误)，也视为配置缺失
            throw new MissingConfigurationError('Invalid or corrupt Steam API Key configuration.');
        }

        // 2. 获取用户本地的 Backlog 数据
        const localBacklog = await backlogModel.getBacklogByUserId(userId);
        // 转换为 Map 结构方便查找 (key: appId)
        const backlogMap = localBacklog.reduce((map, item) => {
            map[item.appId] = item;
            return map;
        }, {});

        // 3. 调用 Steam API 代理获取原始游戏数据
        // 📌 修正点 4: 显式传递解密后的 apiKey
        const steamGames = await getOwnedGames(steamId64, apiKey);

        // 4. 合并并格式化数据
        const mergedGames = steamGames.map(game => {
            // steamApi.js 中已将 appid 转换为 appId, playtime_forever 转换为 playtimeMinutes
            const appId = game.appId.toString();
            const backlogEntry = backlogMap[appId];

            return {
                appId: appId,
                name: game.name,
                playtimeMinutes: game.playtimeMinutes,

                // 合并本地数据
                isBacklogged: !!backlogEntry,
                status: backlogEntry ? backlogEntry.status : null,
                userRating: backlogEntry ? backlogEntry.userRating : null,
                targetFinishDate: backlogEntry ? backlogEntry.targetFinishDate : null,
                backlogId: backlogEntry ? backlogEntry.id : null,
            };
        });

        // 5. 返回合并后的数据
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mergedGames));

    } catch (error) {
        console.error('Library sync error:', error.stack || error);

        // 📌 核心修改：捕获特定的 MissingConfigurationError
        if (error instanceof MissingConfigurationError) {
            // 返回 403 Forbidden，通知前端这是配置问题
            res.writeHead(403, { 'Content-Type': 'application/json' });
            // 必须使用 return 立即结束函数执行
            return res.end(JSON.stringify({
                message: error.message,
                errorCode: error.errorCode, // 'E_MISSING_STEAM_API_KEY'
                requiresAction: true
            }));
        }

        // 处理其他 API 错误，例如 Steam 账户私有
        const message = error.message.includes('403') || error.message.includes('Forbidden')
            ? '无法访问 Steam 账户，请确保您的 SteamID64 正确且账户公开。'
            : '同步游戏库失败。';

        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: message }));
    }
};

module.exports.syncLibrary = syncLibrary;