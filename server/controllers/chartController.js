const steamApi = require('../utils/steamApi');
const { readJsonFile } = require('../utils/fileUtils');
const backlogModel = require('../models/backlogModel');
const { authenticate } = require('./authController');

/**
 * Helper function: Get SteamID64 by userId
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

        // 2. Call Steam API to get game data
        const steamGames = await steamApi.getOwnedGames(steamId64);

        // 3. Sort games by playtime (descending) and filter out games with 0 playtime
        const gamesWithPlaytime = steamGames
            .filter(game => game.playtime_forever > 0)
            .sort((a, b) => b.playtime_forever - a.playtime_forever);

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
            dataValues.push(Math.round(game.playtime_forever / 60)); // Convert to hours
            backgroundColors.push(colorPalette[index % colorPalette.length]);
        });

        // Add "Others" if there are more games
        if (otherGames.length > 0) {
            const othersPlaytime = otherGames.reduce((sum, game) => sum + game.playtime_forever, 0);
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
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Failed to generate chart data.' }));
    }
};

module.exports = {
    getPlaytimeSummary
};