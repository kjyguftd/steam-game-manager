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
const gameFilterSelect = document.getElementById('game-filter');

let playtimeChartInstance = null;
let allGames = []; // Store all games for filtering
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
            displayAuthMessage('Login successful!', false);
            setUIVisible(true);
            loginForm.reset();

            // Load dashboard after successful login
            loadDashboard();

        } else {
            displayAuthMessage(`Login failed: ${result.message}`, true);
        }
    } catch (error) {
        displayAuthMessage('Network error, please try again later.', true);
    }
});

logoutButton.addEventListener('click', async () => {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });

        displayAuthMessage('Logged out successfully.', false);
        setUIVisible(false);
        // Clear UI data
        gameListUl.innerHTML = '';
        // Ignore Ollama-related cleanup
        playerProfileEl.innerHTML = 'Click Sync Library to get AI insights...';
        lifeBalanceEl.innerHTML = '';
        if (playtimeChartInstance) {
            playtimeChartInstance.destroy();
            playtimeChartInstance = null;
        }

    } catch (error) {
        displayAuthMessage('Network error, unable to logout.', true);
        setUIVisible(false);
    }
});

themeToggleBtn.addEventListener('click', () => {
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

    // Re-render chart colors after switching
    if (mainApp.style.display === 'grid') {
        renderPlaytimeChart();
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

    // Remove spaces from status for CSS class names
    const cleanStatus = game.status ? game.status.replace(/\s/g, '') : '';
    const statusClass = game.status ? `status-${cleanStatus}` : 'status-unmarked';
    const playtimeHours = Math.round(game.playtimeMinutes / 60);
    const ratingDisplay = game.userRating ? `⭐️ ${game.userRating}/10` : 'Not Rated';
    const statusDisplay = game.status || '';

    // Steam game cover image URLs with multiple fallbacks
    const imageUrls = [
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
        `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appId}/capsule_616x353.jpg`,
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/library_600x900.jpg`,
        `https://steamcdn-a.akamaihd.net/steam/apps/${game.appId}/header.jpg`
    ];

    // Create status selector options
    const statuses = ['Planning', 'Playing', 'Completed'];
    const statusOptionsHtml = statuses.map(status => `
        <option value="${status.replace(/\s/g, '')}" ${cleanStatus === status.replace(/\s/g, '') ? 'selected' : ''}>${status}</option>
    `).join('');

    // Add placeholder option if game has no status
    const hasStatus = game.status && game.status !== 'Not Started' && game.status !== null;
    const optionsHtml = hasStatus
        ? statusOptionsHtml
        : `<option value="" selected disabled>-- Set Status --</option>${statusOptionsHtml}`;

    li.innerHTML = `
        <div class="${statusClass} status-bar"></div>
        <div class="game-image-container">
             <img src="${imageUrls[0]}"
                  data-fallback-urls='${JSON.stringify(imageUrls.slice(1))}'
                  alt="${game.name}"
                  class="game-cover-image">
             <div class="game-image-placeholder" style="display:none;">
                 ${game.name.substring(0, 1)}
             </div>
        </div>
        <div class="game-info">
            <h5 class="game-title">${game.name}</h5>
            ${statusDisplay ? `<span class="game-status ${statusClass}">${statusDisplay}</span>` : ''}
            <div class="game-details">
                <span class="playtime">Total Playtime: ${playtimeHours} hours</span>
                <span>${ratingDisplay}</span>
            </div>
            <div class="actions mt-1">
                <select class="status-selector" data-appid="${game.appId}" data-backlogid="${game.backlogId || ''}">
                    ${optionsHtml}
                </select>
            </div>
        </div>
    `;

    // Bind event listener for status selector
    li.querySelector('.status-selector').addEventListener('change', (e) => {
        const newStatus = e.target.value;
        const appId = e.target.getAttribute('data-appid');
        const backlogId = e.target.getAttribute('data-backlogid');

        updateGameStatus(appId, backlogId, newStatus);
    });

    // Handle image loading with fallback URLs
    const imgElement = li.querySelector('.game-cover-image');
    const placeholderElement = li.querySelector('.game-image-placeholder');
    let currentFallbackIndex = 0;

    imgElement.addEventListener('error', function() {
        const fallbackUrls = JSON.parse(this.getAttribute('data-fallback-urls') || '[]');

        if (currentFallbackIndex < fallbackUrls.length) {
            // Try next fallback URL
            this.src = fallbackUrls[currentFallbackIndex];
            currentFallbackIndex++;
        } else {
            // All URLs failed, show placeholder
            this.style.display = 'none';
            placeholderElement.style.display = 'flex';
        }
    });

    return li;
};

/**
 * 客户端：获取游戏库数据并渲染列表
 */
const syncLibraryData = async () => {
    syncLibraryBtn.disabled = true;
    syncLibraryBtn.textContent = '🔄 Syncing...';
    gameListUl.innerHTML = '';
    playerProfileEl.innerHTML = 'Click Sync Library to get AI insights...'; // Keep placeholder

    try {
        const response = await fetch(`${API_BASE_URL}/library/sync`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to sync library.');
        }

        const games = await response.json();
        allGames = games; // Store games for filtering

        if (games.length === 0) {
            gameListUl.innerHTML = '<p class="message" style="color:var(--color-text-muted);">No games found or your Steam account is private.</p>';
        } else {
            renderFilteredGames(); // Use filter function instead of direct rendering
        }

        // Update chart after successful sync (chart data endpoint uses same base data)
        renderPlaytimeChart();

    } catch (error) {
        gameListUl.innerHTML = `<p class="message" style="color:var(--color-error);">Sync error: ${error.message}</p>`;
    } finally {
        syncLibraryBtn.disabled = false;
        syncLibraryBtn.textContent = '🔄 Sync Library';
    }
};

/**
 * Filter and render games based on selected filter
 */
const renderFilteredGames = () => {
    const filterValue = gameFilterSelect.value;
    gameListUl.innerHTML = '';

    let filteredGames = allGames;

    switch (filterValue) {
        case 'never-played':
            filteredGames = allGames.filter(game => game.playtimeMinutes === 0);
            break;
        case 'over-50h':
            filteredGames = allGames.filter(game => game.playtimeMinutes > 3000); // 50 hours * 60 minutes
            break;
        case 'over-100h':
            filteredGames = allGames.filter(game => game.playtimeMinutes > 6000); // 100 hours * 60 minutes
            break;
        case 'all':
        default:
            filteredGames = allGames;
            break;
    }

    if (filteredGames.length === 0) {
        gameListUl.innerHTML = '<p class="message" style="color:var(--color-text-muted);">No games found matching this filter.</p>';
    } else {
        filteredGames.forEach(game => {
            gameListUl.appendChild(renderGameCard(game));
        });
    }
};

/**
 * 客户端：更新游戏状态 (CRUD: PUT/POST)
 * @param {string} appId
 * @param {string} backlogId
 * @param {string} newStatus
 */
const updateGameStatus = async (appId, backlogId, newStatus) => {
    // 1. Determine whether to create (POST) or update (PUT)
    const method = backlogId ? 'PUT' : 'POST';
    const url = backlogId ? `${API_BASE_URL}/backlog/${backlogId}` : `${API_BASE_URL}/backlog`;
    const payload = backlogId
        ? { status: newStatus } // Update only needs status
        : { appId: appId, status: newStatus }; // Create needs appId and status

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Failed to update status.`);
        }

        // After success, force re-sync data to update UI and chart
        syncLibraryData();

    } catch (error) {
        alert(`Status update failed: ${error.message}`);
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
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textColor,
                            boxWidth: 15,
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Top 15 Games by Playtime',
                        color: textColor,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} hrs (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Chart rendering failed:', error);
        playtimeChartCanvas.innerHTML = '<p style="color:var(--color-error);">Unable to load chart data.</p>';
    }
};


// ------------------- 初始化 -------------------

const loadDashboard = async () => {
    // 1. Load chart and game list (syncLibraryData will call renderPlaytimeChart)
    syncLibraryData();

    // 2. Ignore Ollama-related calls
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

// Add filter change event listener
gameFilterSelect.addEventListener('change', renderFilteredGames);

// 监听系统主题变化，并重新渲染图表以更新文本颜色
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (mainApp.style.display === 'grid') {
        renderPlaytimeChart(); // 重新渲染图表即可更新颜色
    }
});