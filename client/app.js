// --- DOM 元素引用 ---
const authSection = document.getElementById('auth-section');
const mainApp = document.getElementById('main-app');
const authMessage = document.getElementById('auth-message');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterBtn = document.getElementById('show-register');
const hideRegisterBtn = document.getElementById('hide-register');
const logoutButton = document.getElementById('logout-button');
const playtimeChartCanvas = document.getElementById('playtime-chart');
let playtimeChartInstance = null; // 用于存储 Chart.js 实例

// --- 基础配置 ---
const API_BASE_URL = '/api/auth';

/**
 * 辅助函数：显示/隐藏 UI 区域
 */
const setUIVisible = (isLoggedIn) => {
    authSection.style.display = isLoggedIn ? 'none' : 'block';
    mainApp.style.display = isLoggedIn ? 'block' : 'none';
};

/**
 * 辅助函数：显示认证消息
 */
const displayAuthMessage = (message, isError = false) => {
    authMessage.textContent = message;
    authMessage.style.color = isError ? 'red' : 'green';
};

/**
 * 客户端验证 (Client-side Validation)
 * @param {object} data - 表单数据
 * @returns {string|null} 错误信息或 null
 */
const validateForm = (data) => {
    if (!data.username || !data.password) {
        return '用户名和密码不能为空。';
    }
    if (data.password.length < 6) {
        return '密码长度至少为 6 位。';
    }
    // 注册时验证 SteamID64
    if (data.isRegister && !data.steamId64) {
        return 'SteamID64 不能为空。';
    }
    return null;
};

/**
 * 渲染游戏时间分布图表
 */
const renderPlaytimeChart = async () => {
    try {
        const response = await fetch('/api/charts/playtime');
        if (!response.ok) {
            throw new Error('Failed to fetch chart data');
        }
        const data = await response.json();

        // 如果图表已存在，先销毁它
        if (playtimeChartInstance) {
            playtimeChartInstance.destroy();
        }

        // 创建新的 Chart.js 实例
        playtimeChartInstance = new Chart(playtimeChartCanvas, {
            type: 'pie', // 选择饼图 (Pie Chart)
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: '游戏时间分布 (按本地状态)'
                    }
                }
            }
        });

    } catch (error) {
        console.error('Chart rendering failed:', error);
        // 如果失败，可以在 canvas 上显示错误消息
        playtimeChartCanvas.getContext('2d').fillText('无法加载图表数据。', 10, 50);
    }
};

// ------------------- 注册逻辑 -------------------

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.elements['reg-username'].value.trim();
    const password = e.target.elements['reg-password'].value;
    const steamId64 = e.target.elements['reg-steamid'].value.trim();

    const formData = { username, password, steamId64, isRegister: true };
    const validationError = validateForm(formData);

    if (validationError) {
        return displayAuthMessage(validationError, true);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
            displayAuthMessage('注册成功！请登录。', false);
            // 切换回登录界面
            registerForm.style.display = 'none';
            showRegisterBtn.style.display = 'block';
            loginForm.style.display = 'block';
            // 清空注册表单
            registerForm.reset();
        } else {
            // 服务器端验证错误 (如用户已存在)
            displayAuthMessage(`注册失败: ${result.message}`, true);
        }
    } catch (error) {
        console.error('Registration failed:', error);
        displayAuthMessage('网络错误，请稍后再试。', true);
    }
});


// ------------------- 登录逻辑 -------------------

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.elements['login-username'].value.trim();
    const password = e.target.elements['login-password'].value;

    const formData = { username, password };
    const validationError = validateForm(formData);

    if (validationError) {
        return displayAuthMessage(validationError, true);
    }

    // 客户端发送请求时，浏览器会自动附带 HttpOnly Cookie (如果有)
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
            // 登录成功，切换到主应用界面
            displayAuthMessage('登录成功！', false);
            setUIVisible(true);
            loginForm.reset();

            // 关键：登录成功后加载仪表板和图表
            await loadDashboard();

        } else {
            displayAuthMessage(`登录失败: ${result.message}`, true);
        }
    } catch (error) {
        console.error('Login failed:', error);
        displayAuthMessage('网络错误，请稍后再试。', true);
    }
});

// ------------------- 登出逻辑 -------------------

logoutButton.addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
        });

        // 无论服务器响应成功与否，客户端都应该尝试清除界面状态
        // 因为服务器会发送一个 Max-Age=0 的 Cookie 来清除会话
        if (response.ok) {
            displayAuthMessage('已安全登出。', false);
        } else {
            displayAuthMessage('登出请求失败，但会话可能已清除。', true);
        }

        setUIVisible(false);

    } catch (error) {
        console.error('Logout error:', error);
        displayAuthMessage('网络错误，无法完成登出。', true);
        setUIVisible(false); // 强制切换界面
    }
});

// ------------------- 游戏库同步逻辑 (需在 syncLibrary 调用后调用图表) -------------------

// ⚠️ 假设我们在步骤 8 中预留了一个 loadDashboard 函数。
const loadDashboard = async () => {
    // 1. 加载图表
    renderPlaytimeChart();

    // 2. [TODO] 客户端应该在此处调用 /api/library/sync 并渲染游戏列表
    // syncLibraryData();

    // 3. [TODO] 调用 AI 洞察端点
    // fetchAIBasedInsights();
};

// ------------------- 界面切换 -------------------

showRegisterBtn.addEventListener('click', () => {
    loginForm.style.display = 'none';
    showRegisterBtn.style.display = 'none';
    registerForm.style.display = 'block';
    authMessage.textContent = ''; // 清除消息
});

hideRegisterBtn.addEventListener('click', () => {
    registerForm.style.display = 'none';
    showRegisterBtn.style.display = 'block';
    loginForm.style.display = 'block';
    authMessage.textContent = ''; // 清除消息
});

// ------------------- 初始化检查 -------------------

/**
 * 应用程序启动时检查用户是否已通过有效会话登录。
 * 注意：由于 HttpOnly Cookie 无法在客户端读取，我们需要一个服务器端端点来验证会话。
 * 在此项目中，我们暂时依赖登录/登出操作来管理 UI 状态。
 * 真正的“检查登录状态”需要实现 GET /api/auth/status 端点。
 */
const checkLoginStatus = () => {
    // 假设在没有强制检查端点的情况下，我们默认显示登录界面
    setUIVisible(false);
};

// 启动应用程序
document.addEventListener('DOMContentLoaded', checkLoginStatus);