import { API_BASE_URL } from './src/constants.js';
import { setUIVisible } from './src/utils.js';
import { renderFilteredGames, initLibrary } from './src/library.js';
import { handleLogin, handleRegister, handleLogout, showRegisterForm, hideRegisterForm } from './src/auth.js';
import { loadDashboard, handleThemeToggle } from './src/uiHandlers.js';
import {
    loginForm, registerForm, logoutButton, showRegisterBtn, hideRegisterBtn,
    syncLibraryBtn, themeToggleBtn, gameFilterSelect, mainApp
} from './src/donElements.js';
import { renderPlaytimeChart } from './src/chart.js';

/**
 * 检查当前是否有有效的会话，并相应地加载 UI。
 */
const checkLoginStatus = async () => {
    try {
        // 尝试访问一个需要认证的端点
        const response = await fetch(`${API_BASE_URL}/library/sync`);
        if (response.ok) {
            setUIVisible(true);
            loadDashboard();
        } else {
            setUIVisible(false);
        }
    } catch (error) {
        // 网络错误或服务器连接失败，显示登录界面
        setUIVisible(false);
    }
};

// --- 事件绑定 ---

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    initLibrary(); // 📌 修正点 1 (App): 初始化库模块（绑定 API Key Modal 事件）
});

// 认证事件
registerForm.addEventListener('submit', handleRegister);
loginForm.addEventListener('submit', handleLogin);
logoutButton.addEventListener('click', handleLogout);

// 界面切换事件
showRegisterBtn.addEventListener('click', showRegisterForm);
hideRegisterBtn.addEventListener('click', hideRegisterForm);

// 核心功能事件
syncLibraryBtn.addEventListener('click', loadDashboard); // loadDashboard 会触发 syncLibraryData
gameFilterSelect.addEventListener('change', renderFilteredGames);

// UI 交互事件
themeToggleBtn.addEventListener('click', handleThemeToggle);

// 监听系统主题变化（针对 Chart.js）
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    // 仅在主应用可见时重新渲染图表
    if (mainApp.style.display === 'grid') {
        renderPlaytimeChart();
    }
});