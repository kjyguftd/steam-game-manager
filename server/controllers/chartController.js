// 注意：这里我们直接调用 libraryController 中的 syncLibrary 逻辑来获取合并后的数据
// 但只在服务器内部使用，不向客户端发送完整的游戏列表。
const libraryController = require('./libraryController');
const { authenticate } = require('./authController');

/**
 * 聚合游戏时间数据并生成 Chart.js 所需的格式。
 * * 我们将计算：根据本地 Backlog 状态（Planning, Playing, Completed, Not Started）
 * 的总游戏时间（Playtime Minutes）。
 */
const getPlaytimeSummary = async (req, res) => {
    // 确保请求已通过认证，并获取到 req.userId
    const userId = req.userId;

    try {
        // 1. 获取合并后的游戏数据 (这里复用 libraryController 的逻辑)
        // ⚠️ 注意：我们不能直接调用 syncLibrary，因为它会尝试写入响应。
        // 我们需要重构 libraryController 或直接复制核心数据获取逻辑。

        // ------------------ 简化的数据获取流程 (假设我们已重构) ------------------
        // 为避免复杂的重构，我们直接模拟从 Steam 获取数据并合并本地数据的过程。

        // 💡 最佳实践：将数据获取逻辑抽离成一个 service/util 函数
        const mergedGames = await new Promise((resolve, reject) => {
            // 暂时模拟调用 libraryController.syncLibrary 的内部数据
            // 实际上，你需要从 libraryController 中抽取出获取合并数据的核心函数
            // 这里为简化，假设我们有一个内部函数 `getMergedData`

            // --- 临时模拟数据 ---
            // 实际应该调用：const steamId64 = await getSteamId64ByUserId(userId);
            // const steamGames = await steamApi.getOwnedGames(steamId64);
            // const localBacklog = await backlogModel.getBacklogByUserId(userId);
            // resolve(merge(steamGames, localBacklog));
            // --- 临时模拟数据 ---

            // 假定获取到的数据格式：
            resolve([
                { name: 'Game A', playtimeMinutes: 1200, status: 'Completed' },
                { name: 'Game B', playtimeMinutes: 600, status: 'Playing' },
                { name: 'Game C', playtimeMinutes: 180, status: 'Planning' },
                { name: 'Game D', playtimeMinutes: 300, status: 'Completed' },
                { name: 'Game E', playtimeMinutes: 0, status: 'Not Started' },
                { name: 'Game F', playtimeMinutes: 1500, status: 'Playing' },
            ]);
        });

        // -----------------------------------------------------------------------


        // 2. 聚合数据：按状态汇总游戏时间
        const playtimeByStatus = mergedGames.reduce((acc, game) => {
            const status = game.status || 'Not Started'; // 如果没有本地状态，则为 Not Started
            const playtime = game.playtimeMinutes || 0;

            acc[status] = (acc[status] || 0) + playtime;
            return acc;
        }, {});

        // 3. 转换为 Chart.js 格式
        const labels = Object.keys(playtimeByStatus);
        const dataValues = Object.values(playtimeByStatus).map(minutes => Math.round(minutes / 60)); // 转换为小时

        const chartData = {
            labels: labels,
            datasets: [{
                label: '总游戏时间 (小时)',
                data: dataValues,
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)', // Completed (绿色系)
                    'rgba(255, 159, 64, 0.6)', // Playing (橙色系)
                    'rgba(54, 162, 235, 0.6)', // Planning (蓝色系)
                    'rgba(201, 203, 207, 0.6)' // Not Started (灰色系)
                ],
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