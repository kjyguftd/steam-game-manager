const backlogModel = require('../models/backlogModel');

// 辅助函数：标准化响应
const sendResponse = (res, statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
};

/**
 * 获取当前用户的 Backlog (仅本地数据，通常用于内部检查)
 * 客户端应使用 /api/library/sync 获取合并数据
 */
const getAllBacklogItems = async (req, res) => {
    try {
        const items = await backlogModel.getBacklogByUserId(req.userId);
        sendResponse(res, 200, items);
    } catch (error) {
        console.error('Error fetching backlog:', error);
        sendResponse(res, 500, { message: 'Failed to fetch backlog items.' });
    }
};

/**
 * 创建 Backlog 条目 (对应游戏卡片上的 "添加到 Backlog" 操作)
 */
const createBacklog = async (req, res) => {
    const { appId, status, userRating, targetFinishDate } = req.body;

    // 服务端验证
    if (!appId || !status) {
        return sendResponse(res, 400, { message: 'App ID and Status are required.' });
    }

    try {
        const newItem = await backlogModel.createBacklogItem(
            req.userId,
            appId,
            { status, userRating, targetFinishDate }
        );
        sendResponse(res, 201, newItem);
    } catch (error) {
        console.error('Error creating backlog item:', error);
        // 捕获模型中抛出的“已存在”错误
        const statusCode = error.message.includes('already exists') ? 409 : 500;
        sendResponse(res, statusCode, { message: error.message });
    }
};

/**
 * 更新 Backlog 条目
 */
const updateBacklog = async (req, res) => {
    // 路由解析器需要提取出 URL 中的 itemId (例如 /api/backlog/123)
    // ⚠️ 路由处理需要增强以解析动态 ID
    const itemId = req.url.split('/').pop();
    const updates = req.body;

    // 服务端验证：至少要有一个更新字段
    if (Object.keys(updates).length === 0) {
        return sendResponse(res, 400, { message: 'No fields provided for update.' });
    }

    try {
        const updatedItem = await backlogModel.updateBacklogItem(req.userId, itemId, updates);
        sendResponse(res, 200, updatedItem);
    } catch (error) {
        console.error('Error updating backlog item:', error);
        sendResponse(res, 404, { message: 'Update failed: Item not found or unauthorized.' });
    }
};

/**
 * 删除 Backlog 条目
 */
const deleteBacklog = async (req, res) => {
    const itemId = req.url.split('/').pop(); // ⚠️ 路由处理需要增强

    try {
        await backlogModel.deleteBacklogItem(req.userId, itemId);
        sendResponse(res, 204, null); // 204 No Content for successful deletion
    } catch (error) {
        console.error('Error deleting backlog item:', error);
        sendResponse(res, 404, { message: 'Delete failed: Item not found or unauthorized.' });
    }
};

module.exports = {
    getAllBacklogItems,
    createBacklog,
    updateBacklog,
    deleteBacklog
};