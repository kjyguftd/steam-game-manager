/**
 * 统一管理所有 DOM 元素的引用
 */

// 认证/主应用区域
export const authSection = document.getElementById('auth-section');
export const mainApp = document.getElementById('main-app');
export const authMessage = document.getElementById('auth-message');
export const logoutButton = document.getElementById('logout-button');

// 认证表单
export const loginForm = document.getElementById('login-form');
export const registerForm = document.getElementById('register-form');
export const showRegisterBtn = document.getElementById('show-register');
export const hideRegisterBtn = document.getElementById('hide-register');

// 仪表盘元素
export const syncLibraryBtn = document.getElementById('sync-library');
export const gameListUl = document.getElementById('game-list');
export const playtimeChartCanvas = document.getElementById('playtime-chart');
export const playerProfileEl = document.getElementById('player-profile');
export const lifeBalanceEl = document.getElementById('life-balance');
export const themeToggleBtn = document.getElementById('theme-toggle');
export const gameFilterSelect = document.getElementById('game-filter');

// 📌 修正点 1: 移除 apiKeyUserIdInput 的导出
export const apiKeyModal = document.getElementById('apikey-modal');
export const apiKeyKeyInput = document.getElementById('apikey-key');
export const apiKeyCancelBtn = document.getElementById('apikey-cancel');
export const apiKeySaveBtn = document.getElementById('apikey-save');