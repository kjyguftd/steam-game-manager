import { API_BASE_URL, playtimeChartInstance } from './constants.js';
import { displayAuthMessage, setUIVisible, validateForm } from './utils.js';
import { loadDashboard } from './uiHandlers.js';
import {
    loginForm, registerForm, showRegisterBtn, hideRegisterBtn,
    logoutButton, gameListUl, playerProfileEl, lifeBalanceEl
} from './donElements.js';

// --- 认证事件处理函数 ---

export const handleRegister = async (e) => {
    e.preventDefault();

    const username = e.target.elements['reg-username'].value.trim();
    const password = e.target.elements['reg-password'].value;
    const steamId64 = e.target.elements['reg-steamid'].value.trim();

    const formData = { username, password, steamId64, isRegister: true };
    const validationError = validateForm(formData);

    if (validationError) return displayAuthMessage(validationError, true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
            // 📌 修正点 1 (Register): 虽然通常用户会跳转登录，但如果后端返回了 userId，这里也可以设置。
            // 最佳实践：注册后应让用户走登录流程，这里不设置全局ID。

            displayAuthMessage('Registration successful! Please login.', false);
            // Switch back to login form
            registerForm.style.display = 'none';
            showRegisterBtn.style.display = 'block';
            loginForm.style.display = 'block';
            registerForm.reset();
        } else {
            displayAuthMessage(`Registration failed: ${result.message}`, true);
        }
    } catch (error) {
        displayAuthMessage('Network error, please try again later.', true);
    }
};

export const handleLogin = async (e) => {
    e.preventDefault();

    const username = e.target.elements['login-username'].value.trim();
    const password = e.target.elements['login-password'].value;

    const formData = { username, password };
    const validationError = validateForm(formData);

    if (validationError) return displayAuthMessage(validationError, true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
            // 📌 核心修正点 (Login): 将后端返回的 userId 存储到全局变量
            if (result.userId) {
                window.currentUserId = result.userId; // 保留旧的变量以防依赖
                window.CURRENT_USER_ID = result.userId; // 标准化变量
            } else {
                console.warn("Login successful, but userId was missing from the backend response.");
            }

            displayAuthMessage('Login successful!', false);
            setUIVisible(true);
            loginForm.reset();
            loadDashboard(); // 加载仪表板，它会触发 library.js 的同步

        } else {
            displayAuthMessage(`Login failed: ${result.message}`, true);
        }
    } catch (error) {
        displayAuthMessage('Network error, please try again later.', true);
    }
};

export const handleLogout = async () => {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });

        // 📌 修正点 2 (Logout): 登出时清理全局 userId
        window.currentUserId = null;
        window.CURRENT_USER_ID = null;

        displayAuthMessage('Logged out successfully.', false);
        setUIVisible(false);
        // 清理 UI
        gameListUl.innerHTML = '';
        playerProfileEl.innerHTML = 'Click Sync Library to get AI insights...';
        lifeBalanceEl.innerHTML = '';
        if (playtimeChartInstance) {
            playtimeChartInstance.destroy();
        }

    } catch (error) {
        displayAuthMessage('Network error, unable to logout.', true);
        setUIVisible(false);
    }
};

// --- 界面切换处理函数 ---

export const showRegisterForm = () => {
    loginForm.style.display = 'none';
    showRegisterBtn.style.display = 'none';
    registerForm.style.display = 'block';
    authMessage.textContent = '';
};

export const hideRegisterForm = () => {
    registerForm.style.display = 'none';
    showRegisterBtn.style.display = 'block';
    loginForm.style.display = 'block';
    authMessage.textContent = '';
};