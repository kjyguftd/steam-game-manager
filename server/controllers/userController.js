// userController.js

// 假设 userModel 路径正确，并且它导出了 saveSteamApiKey 函数
const userModel = require('../models/userModel.js');

module.exports.saveApiKey = async (req, res) => {
    // req.params.id 应该由 router.js 负责解析
    const userId = req.params.id; // URL parameter
    const authUserId = req.userId; // 从 authenticate 中间件获取的已登录用户 ID
    const { apiKey } = req.body;

    // 安全性检查：确保用户只能为自己保存 Key
    if (authUserId && userId !== authUserId) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Forbidden: Cannot save key for another user.' }));
    }

    if (!userId || !apiKey) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'missing_param', message: 'userId and apiKey required' }));
    }

    try {
        // 调用 Model 层函数处理数据的查找和更新（现在 Model 内部会进行加密）
        const success = await userModel.saveSteamApiKey(userId, apiKey);

        // 2. 根据 Model 的结果返回响应
        if (success) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, message: 'API Key saved successfully' }));
        } else {
            // 如果 Model 返回 false，通常意味着找不到用户
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'user_not_found', message: 'User not found for API Key saving.' }));
        }

    } catch (e) {
        console.error('Save API key failed:', e);
        // 3. 捕获任何潜在的内部服务器错误（如文件读写失败）
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'save_failed', message: e.message || 'internal_server_error' }));
    }
};