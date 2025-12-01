const steamApi = require('../utils/steamApi');
const { readJsonFile } = require('../utils/fileUtils');
const { authenticate } = require('./authController'); // 导入认证中间件

const USER_FILE = 'users.json'; // 引用用户数据文件

/**
 * 辅助函数：根据 userId 查找用户的 SteamID64
 */
const getSteamId64ByUserId = async (userId) => {
    const users = await readJsonFile(USER_FILE);
    const user = users.find(u => u.id === userId);
    return user ? user.steamId64 : null;
};

const backlogModel = require('../models/backlogModel'); // 引入 Backlog 模型

/**
 * 游戏库同步处理函数
 * * 注意：此函数需要在 router.js 中通过 authenticate 中间件调用。
 * req.userId 将由 authenticate 中间件设置。
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

        // 2. 获取用户本地的 Backlog 数据
        const localBacklog = await backlogModel.getBacklogByUserId(userId);
        // 转换为 Map 结构方便查找 (key: appId)
        const backlogMap = localBacklog.reduce((map, item) => {
            map[item.appId] = item;
            return map;
        }, {});

        // 3. 调用 Steam API 代理获取原始游戏数据
        const steamGames = await steamApi.getOwnedGames(steamId64);

        // 4. 合并并格式化数据
        const mergedGames = steamGames.map(game => {
            const appId = game.appid.toString();
            const backlogEntry = backlogMap[appId];

            return {
                appId: appId,
                name: game.name,
                playtimeMinutes: game.playtime_forever,
                // imageIconUrl: `...`, // 如果需要，可以添加图片 URL

                // 合并本地数据
                isBacklogged: !!backlogEntry,
                status: backlogEntry ? backlogEntry.status : null, // No default status
                userRating: backlogEntry ? backlogEntry.userRating : null,
                targetFinishDate: backlogEntry ? backlogEntry.targetFinishDate : null,
                // 本地 Backlog 的唯一 ID (用于后续 CRUD 操作)
                backlogId: backlogEntry ? backlogEntry.id : null,
            };
        });

        // 5. 返回合并后的数据
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mergedGames));

    } catch (error) {
        console.error('Library sync error:', error);
        // 如果是 Steam 账户私有，可能会返回 403 或其他错误
        const message = error.message.includes('403')
            ? '无法访问 Steam 账户，请确保您的账户公开。'
            : '同步游戏库失败。';

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: message }));
    }
};

module.exports = {
    syncLibrary
};