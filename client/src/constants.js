/**
 * 全局配置和状态变量
 */

export const API_BASE_URL = '/api';

// 用于存储所有游戏数据供筛选，需要在 library.js 中更新
export const allGames = [];

// 用于存储 Chart.js 实例
export let playtimeChartInstance = null;

// 设置 Chart 实例的 setter，方便在 chart.js 中更新
export const setPlaytimeChartInstance = (instance) => {
    playtimeChartInstance = instance;
};