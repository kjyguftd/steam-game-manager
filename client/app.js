// --- DOM 元素引用 ---
const authSection = document.getElementById('auth-section');
const mainApp = document.getElementById('main-app');
const authMessage = document.getElementById('auth-message');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterBtn = document.getElementById('show-register');
const hideRegisterBtn = document.getElementById('hide-register');
const logoutButton = document.getElementById('logout-button');

// 新增功能元素引用
const syncLibraryBtn = document.getElementById('sync-library');
const gameListUl = document.getElementById('game-list');
const playtimeChartCanvas = document.getElementById('playtime-chart');
// 忽略 Ollama 相关的元素，但保留 AI 区域的占位符
const playerProfileEl = document.getElementById('player-profile');
const lifeBalanceEl = document.getElementById('life-balance');
const themeToggleBtn = document.getElementById('theme-toggle');

let playtimeChartInstance = null;
const API_BASE_URL = '/api';

// --- 辅助函数 ---

/**
 * 设置主应用和认证区域的可见性
 * @param {boolean} isLoggedIn - 是否已登录
 */
const setUIVisible = (isLoggedIn) => {
    authSection.style.display = isLoggedIn ? 'none' : 'block';
    mainApp.style.display = isLoggedIn ? 'grid' : 'none';
    logoutButton.style.display = isLoggedIn ? 'block' : 'none';
};

/**
 * 显示认证消息
 */
const displayAuthMessage = (message, isError = false) => {
    authMessage.textContent = message;
    authMessage.style.color = isError ? 'var(--color-error)' : 'var(--color-success)';
};

/**
 * 客户端验证
 */
const validateForm = (data) => {
    if (!data.username || !data.password) {
        return '用户名和密码不能为空。';
    }
    if (data.password.length < 6) {
        return '密码长度至少为 6 位。';
    }
    if (data.isRegister && !data.steamId64) {
        return 'SteamID64 不能为空。';
    }
    return null;
};

/**
 * 根据系统偏好设置判断是否为深色模式，并返回 Chart.js 应使用的文本颜色。
 * @returns {string} Chart.js 应使用的文本颜色。
 */
const getChartTextColor = () => {
    // 检查浏览器是否偏好深色模式
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 如果是深色模式，使用亮色文本 (#f0f0f0); 否则使用深色文本 (#333333)。
    return isDarkMode ? '#f0f0f0' : '#333333';
};

const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.classList.add(savedTheme + '-mode');
}

// ------------------- 认证逻辑 -------------------

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
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
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
            registerForm.reset();
        } else {
            displayAuthMessage(`注册失败: ${result.message}`, true);
        }
    } catch (error) {
        displayAuthMessage('网络错误，请稍后再试。', true);
    }
});


loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.elements['login-username'].value.trim();
    const password = e.target.elements['login-password'].value;

    const formData = { username, password };
    const validationError = validateForm(formData);

    if (validationError) {
        return displayAuthMessage(validationError, true);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
            displayAuthMessage('登录成功！', false);
            setUIVisible(true);
            loginForm.reset();

            // 登录成功后加载仪表板
            loadDashboard();

        } else {
            displayAuthMessage(`登录失败: ${result.message}`, true);
        }
    } catch (error) {
        displayAuthMessage('网络错误，请稍后再试。', true);
    }
});

logoutButton.addEventListener('click', async () => {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });

        displayAuthMessage('已安全登出。', false);
        setUIVisible(false);
        // 清理 UI 数据
        gameListUl.innerHTML = '';
        // 忽略 Ollama 相关的清理
        playerProfileEl.innerHTML = '点击同步库后获取AI洞察...';
        lifeBalanceEl.innerHTML = '';
        if (playtimeChartInstance) {
            playtimeChartInstance.destroy();
            playtimeChartInstance = null;
        }

    } catch (error) {
        displayAuthMessage('网络错误，无法完成登出。', true);
        setUIVisible(false);
    }
});

// ------------------- 界面切换 -------------------

showRegisterBtn.addEventListener('click', () => {
    loginForm.style.display = 'none';
    showRegisterBtn.style.display = 'none';
    registerForm.style.display = 'block';
    authMessage.textContent = '';
});

hideRegisterBtn.addEventListener('click', () => {
    registerForm.style.display = 'none';
    showRegisterBtn.style.display = 'block';
    loginForm.style.display = 'block';
    authMessage.textContent = '';
});


// ------------------- 核心功能：数据渲染与同步 -------------------

/**
 * 渲染单个游戏卡片
 * @param {Object} game - 合并后的游戏数据
 */
const renderGameCard = (game) => {
    const li = document.createElement('li');
    li.className = 'game-item-card';
    li.setAttribute('data-appid', game.appId);
    li.setAttribute('data-backlogid', game.backlogId || '');

    // 移除状态中的空格以便用于 CSS 类名
    const cleanStatus = game.status.replace(/\s/g, '');
    const statusClass = `status-${cleanStatus}`;
    const playtimeHours = Math.round(game.playtimeMinutes / 60);
    const ratingDisplay = game.userRating ? `⭐️ ${game.userRating}/10` : '未评分';

    // 创建状态选择器的选项
    const statuses = ['Not Started', 'Planning', 'Playing', 'Completed'];
    const optionsHtml = statuses.map(status => `
        <option value="${status.replace(/\s/g, '')}" ${cleanStatus === status.replace(/\s/g, '') ? 'selected' : ''}>${status}</option>
    `).join('');

    li.innerHTML = `
        <div class="${statusClass} status-bar"></div>
        <div class="game-image-placeholder">
             <!-- 使用游戏名的首字母作为占位符 -->
             ${game.name.substring(0, 1)}
        </div>
        <div class="game-info">
            <h5 class="game-title">${game.name}</h5>
            <span class="game-status ${statusClass}">${game.status}</span>
            <div class="game-details">
                <span class="playtime">总时长: ${playtimeHours} 小时</span> 
                <span>${ratingDisplay}</span>
            </div>
            <div class="actions mt-1">
                <select class="status-selector" data-appid="${game.appId}" data-backlogid="${game.backlogId || ''}">
                    ${optionsHtml}
                </select>
            </div>
        </div>
    `;

    // 绑定状态选择器的事件监听器
    li.querySelector('.status-selector').addEventListener('change', (e) => {
        const newStatus = e.target.value;
        const appId = e.target.getAttribute('data-appid');
        const backlogId = e.target.getAttribute('data-backlogid');

        updateGameStatus(appId, backlogId, newStatus);
    });

    return li;
};

/**
 * 客户端：获取游戏库数据并渲染列表
 */
const syncLibraryData = async () => {
    syncLibraryBtn.disabled = true;
    syncLibraryBtn.textContent = '🔄 正在同步...';
    gameListUl.innerHTML = '';
    playerProfileEl.innerHTML = '点击同步库后获取AI洞察...'; // 保持占位符

    try {
        const response = await fetch(`${API_BASE_URL}/library/sync`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to sync library.');
        }

        const games = await response.json();

        if (games.length === 0) {
            gameListUl.innerHTML = '<p class="message" style="color:var(--color-text-muted);">未找到任何游戏或您的Steam账户是私有的。</p>';
        } else {
            games.forEach(game => {
                gameListUl.appendChild(renderGameCard(game));
            });
        }

        // 成功同步后，更新图表 (图表数据端点使用相同的基础数据)
        renderPlaytimeChart();

    } catch (error) {
        gameListUl.innerHTML = `<p class="message" style="color:var(--color-error);">同步错误: ${error.message}</p>`;
    } finally {
        syncLibraryBtn.disabled = false;
        syncLibraryBtn.textContent = '🔄 同步游戏库';
    }
};

/**
 * 客户端：更新游戏状态 (CRUD: PUT/POST)
 * @param {string} appId
 * @param {string} backlogId
 * @param {string} newStatus
 */
const updateGameStatus = async (appId, backlogId, newStatus) => {
    // 1. 确定是创建 (POST) 还是更新 (PUT)
    const method = backlogId ? 'PUT' : 'POST';
    const url = backlogId ? `${API_BASE_URL}/backlog/${backlogId}` : `${API_BASE_URL}/backlog`;
    const payload = backlogId
        ? { status: newStatus } // 更新只需要状态
        : { appId: appId, status: newStatus }; // 创建需要 appId 和状态

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Failed to update status.`);
        }

        // 成功后，强制重新同步数据以更新 UI 和图表
        syncLibraryData();

    } catch (error) {
        alert(`状态更新失败: ${error.message}`);
        console.error('Backlog update error:', error);
    }
};


// ------------------- 可视化逻辑 -------------------

/**
 * 渲染游戏时间分布图表
 */
const renderPlaytimeChart = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/charts/playtime`);
        if (!response.ok) {
            throw new Error('Failed to fetch chart data');
        }
        const data = await response.json();

        if (playtimeChartInstance) {
            playtimeChartInstance.destroy();
        }

        const textColor = getChartTextColor(); // 获取当前模式的文本颜色

        playtimeChartInstance = new Chart(playtimeChartCanvas, {
            type: 'pie', // 饼图
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor // 应用文本颜色
                        }
                    },
                    title: {
                        display: true,
                        text: '总游戏时间分布 (按本地状态)',
                        color: textColor // 应用文本颜色
                    }
                }
            }
        });

    } catch (error) {
        console.error('Chart rendering failed:', error);
        playtimeChartCanvas.innerHTML = '<p style="color:var(--color-error);">无法加载图表数据。</p>';
    }
};


// ------------------- 初始化 -------------------

const loadDashboard = async () => {
    // 1. 加载图表和游戏列表 (syncLibraryData 会调用 renderPlaytimeChart)
    syncLibraryData();

    // 2. 忽略 Ollama 相关的调用
};

/**
 * 检查当前是否有有效的会话，并相应地加载 UI。
 */
const checkLoginStatus = async () => {
    try {
        // 尝试访问一个需要认证的端点，如果失败则说明未登录
        // 我们不能直接读取 HttpOnly Cookie，所以依赖服务器的响应状态
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

document.addEventListener('DOMContentLoaded', checkLoginStatus);

syncLibraryBtn.addEventListener('click', syncLibraryData);

// 监听系统主题变化，并重新渲染图表以更新文本颜色
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (mainApp.style.display === 'grid') {
        renderPlaytimeChart(); // 重新渲染图表即可更新颜色
    }
});