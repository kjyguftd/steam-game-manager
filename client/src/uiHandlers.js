import { syncLibraryData } from './library.js';
import { renderPlaytimeChart } from './chart.js';
import { mainApp } from './donElements.js';

/**
 * 登录成功后加载仪表盘数据
 */
export const loadDashboard = async () => {
    // 1. Load chart and game list (syncLibraryData will call renderPlaytimeChart)
    syncLibraryData();
    // 2. Ignore Ollama-related calls
};

/**
 * 处理主题切换
 */
export const handleThemeToggle = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark-mode')) {
        root.classList.remove('dark-mode');
        root.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    } else {
        root.classList.remove('light-mode');
        root.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    }

    // 切换主题后重新渲染图表
    if (mainApp.style.display === 'grid') {
        renderPlaytimeChart();
    }
};