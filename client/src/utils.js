import { authSection, mainApp, logoutButton, authMessage } from './donElements.js';

/**
 * 设置主应用和认证区域的可见性
 * @param {boolean} isLoggedIn - 是否已登录
 */
export const setUIVisible = (isLoggedIn) => {
    authSection.style.display = isLoggedIn ? 'none' : 'block';
    mainApp.style.display = isLoggedIn ? 'grid' : 'none';
    logoutButton.style.display = isLoggedIn ? 'block' : 'none';
};

/**
 * 显示认证消息
 */
export const displayAuthMessage = (message, isError = false) => {
    authMessage.textContent = message;
    authMessage.style.color = isError ? 'var(--color-error)' : 'var(--color-success)';
};

/**
 * 客户端验证
 */
export const validateForm = (data) => {
    if (!data.username || !data.password) {
        return 'Username and password cannot be empty.';
    }
    if (data.password.length < 6) {
        return 'Password must be at least 6 characters.';
    }
    if (data.isRegister && !data.steamId64) {
        return 'SteamID64 cannot be empty.';
    }
    return null;
};

/**
 * 根据系统偏好设置判断是否为深色模式，并返回 Chart.js 应使用的文本颜色。
 * @returns {string} Chart.js 应使用的文本颜色。
 */
export const getChartTextColor = () => {
    // 检查当前设置的主题
    const isDarkMode = document.documentElement.classList.contains('dark-mode');
    return isDarkMode ? '#f0f0f0' : '#333333';
};

// 初始化主题设置
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.classList.add(savedTheme + '-mode');
}