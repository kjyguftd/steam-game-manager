const steamApi = require('../utils/steamApi.js');
const { readJsonFile } = require('../utils/fileUtils.js');
const backlogModel = require('../models/backlogModel.js');
const { authenticate } = require('./authController.js');
// 📌 修正点 1: 导入解密和加密 Key 获取工具
const { decrypt } = require('../utils/crypto.js');
const { getEncryptedApiKey } = require('../utils/userStore.js');

/**
 * Helper function: Get SteamID64 by userId (only ID)
 */
const getSteamId64ByUserId = async (userId) => {
    const users = await readJsonFile('users.json');
    const user = users.find(u => u.id === userId);
    return user ? user.steamId64 : null;
};

/**
 * Get top 15 games by playtime and group others.
 * Display game names with playtime distribution.
 */
const getPlaytimeSummary = async (req, res) => {
    const userId = req.userId;

    try {
        // 1. Get user's SteamID64
        const steamId64 = await getSteamId64ByUserId(userId);
        if (!steamId64) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ message: 'User SteamID64 not found.' }));
        }

        // 📌 修正点 2: 显式获取并解密 API Key
        let apiKey;
        try {
            const encryptedKeyObj = await getEncryptedApiKey(userId);
            if (!encryptedKeyObj) {
                // 如果找不到加密 Key，则抛出配置缺失错误
                throw new steamApi.MissingConfigurationError('Steam API Key not found for user.');
            }
            apiKey = decrypt(encryptedKeyObj);
        } catch (e) {
            // 捕获解密失败或找不到 Key 的错误，并重新抛出配置缺失错误
            if (e instanceof steamApi.MissingConfigurationError) throw e;
            throw new steamApi.MissingConfigurationError('Invalid or corrupt Steam API Key configuration.');
        }

        // 2. Call Steam API to get game data (显式传递解密后的 key)
        const steamGames = await steamApi.getOwnedGames(steamId64, apiKey);

        // 3. Sort games by playtime (descending) and filter out games with 0 playtime
        const gamesWithPlaytime = steamGames
            .filter(game => game.playtimeMinutes > 0) // steamApi already converts to minutes
            .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);

        // 4. Get top 15 games and sum up the rest as "Others"
        const top15Games = gamesWithPlaytime.slice(0, 15);
        const otherGames = gamesWithPlaytime.slice(15);

        const labels = [];
        const dataValues = [];
        const backgroundColors = [];

        // Generate colors for top 15 games
        const colorPalette = [
            'rgba(255, 99, 132, 0.6)',   // Red
            'rgba(54, 162, 235, 0.6)',   // Blue
            'rgba(255, 206, 86, 0.6)',   // Yellow
            'rgba(75, 192, 192, 0.6)',   // Teal
            'rgba(153, 102, 255, 0.6)',  // Purple
            'rgba(255, 159, 64, 0.6)',   // Orange
            'rgba(199, 199, 199, 0.6)',  // Grey
            'rgba(83, 102, 255, 0.6)',   // Indigo
            'rgba(255, 99, 255, 0.6)',   // Pink
            'rgba(99, 255, 132, 0.6)',   // Light Green
            'rgba(255, 132, 99, 0.6)',   // Coral
            'rgba(132, 99, 255, 0.6)',   // Lavender
            'rgba(99, 206, 255, 0.6)',   // Sky Blue
            'rgba(206, 255, 99, 0.6)',   // Lime
            'rgba(255, 99, 206, 0.6)'    // Magenta
        ];

        // Add top 15 games
        top15Games.forEach((game, index) => {
            labels.push(game.name);
            dataValues.push(Math.round(game.playtimeMinutes / 60)); // Convert to hours
            backgroundColors.push(colorPalette[index % colorPalette.length]);
        });

        // Add "Others" if there are more games
        if (otherGames.length > 0) {
            const othersPlaytime = otherGames.reduce((sum, game) => sum + game.playtimeMinutes, 0);
            labels.push('Others');
            dataValues.push(Math.round(othersPlaytime / 60)); // Convert to hours
            backgroundColors.push('rgba(201, 203, 207, 0.6)'); // Grey for Others
        }

        const chartData = {
            labels: labels,
            datasets: [{
                label: 'Playtime (hours)',
                data: dataValues,
                backgroundColor: backgroundColors,
                hoverOffset: 4
            }]
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(chartData));

    } catch (error) {
        console.error('Error fetching playtime summary:', error);

        // 📌 修正点 3: 捕获 MissingConfigurationError
        if (error instanceof steamApi.MissingConfigurationError) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                message: error.message,
                errorCode: error.errorCode,
                requiresAction: true
            }));
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Failed to generate chart data.' }));
    }
};

module.exports = {
    getPlaytimeSummary
};