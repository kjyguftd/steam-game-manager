const { readJsonFile, writeJsonFile } = require('../utils/fileUtils');
const crypto = require('crypto');

const BACKLOG_FILE = 'backlog.json';

/**
 * 获取当前用户的所有 Backlog 条目
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
const getBacklogByUserId = async (userId) => {
    const backlog = await readJsonFile(BACKLOG_FILE);
    // 过滤出属于当前用户的条目
    return backlog.filter(item => item.userId === userId);
};

/**
 * 创建新的 Backlog 条目（关联 Steam AppID）
 * @param {string} userId
 * @param {string} appId - Steam AppID
 * @param {Object} data - { status, userRating, targetFinishDate }
 * @returns {Promise<Object>}
 */
const createBacklogItem = async (userId, appId, data) => {
    const backlog = await readJsonFile(BACKLOG_FILE);

    // 检查是否已经为该 AppID 创建了 Backlog 条目
    const exists = backlog.some(item => item.userId === userId && item.appId === appId);
    if (exists) {
        throw new Error('Backlog item for this game already exists.');
    }

    const newItem = {
        id: crypto.randomUUID(),
        userId: userId,
        appId: appId,
        status: data.status || 'Planning', // 默认状态
        userRating: data.userRating || null,
        targetFinishDate: data.targetFinishDate || null,
    };

    backlog.push(newItem);
    await writeJsonFile(BACKLOG_FILE, backlog);
    return newItem;
};

/**
 * 更新 Backlog 条目
 * @param {string} userId
 * @param {string} itemId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
const updateBacklogItem = async (userId, itemId, updates) => {
    const backlog = await readJsonFile(BACKLOG_FILE);
    const index = backlog.findIndex(item => item.id === itemId && item.userId === userId);

    if (index === -1) {
        throw new Error('Backlog item not found or unauthorized.');
    }

    // 更新字段，只允许更新特定字段
    const item = backlog[index];
    item.status = updates.status !== undefined ? updates.status : item.status;
    item.userRating = updates.userRating !== undefined ? updates.userRating : item.userRating;
    item.targetFinishDate = updates.targetFinishDate !== undefined ? updates.targetFinishDate : item.targetFinishDate;

    await writeJsonFile(BACKLOG_FILE, backlog);
    return item;
};

/**
 * 删除 Backlog 条目
 * @param {string} userId
 * @param {string} itemId
 * @returns {Promise<void>}
 */
const deleteBacklogItem = async (userId, itemId) => {
    let backlog = await readJsonFile(BACKLOG_FILE);
    const initialLength = backlog.length;

    // 确保只删除属于该用户的条目
    backlog = backlog.filter(item => item.id !== itemId || item.userId !== userId);

    if (backlog.length === initialLength) {
        throw new Error('Backlog item not found or unauthorized.');
    }

    await writeJsonFile(BACKLOG_FILE, backlog);
};

module.exports = {
    getBacklogByUserId,
    createBacklogItem,
    updateBacklogItem,
    deleteBacklogItem
};