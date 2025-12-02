// client/src/library.js

import { API_BASE_URL, allGames } from './constants.js'; // 修正: setPlaytimeChartInstance 不在这里使用
// 假设这些 DOM 元素在 donElements.js 中正确定义
import {
    gameListUl, syncLibraryBtn, playerProfileEl, gameFilterSelect,
    apiKeyModal, apiKeyKeyInput, apiKeyCancelBtn, apiKeySaveBtn
} from './donElements.js';
import { renderPlaytimeChart } from './chart.js';
import { displayAuthMessage } from './utils.js'; // 📌 修正点 2: 导入消息显示工具

/**
 * 客户端：更新游戏状态 (CRUD: PUT/POST)
 * * @param {string} appId - Steam App ID
 * @param {string} backlogId - 游戏在 Backlog 中的 ID (如果存在)
 * @param {string} newStatus - 游戏的新状态
 */
export const updateGameStatus = async (appId, backlogId, newStatus) => {
    const method = backlogId ? 'PUT' : 'POST';
    const url = backlogId ? `${API_BASE_URL}/backlog/${backlogId}` : `${API_BASE_URL}/backlog`;
    const payload = backlogId
        ? { status: newStatus }
        : { appId: appId, status: newStatus };

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Failed to update status.`);
        }

        const result = method === 'POST' ? await response.json() : payload;

        // 1. 在前端 allGames 数组中更新数据
        const gameIndex = allGames.findIndex(g => String(g.appId) === String(appId));
        if (gameIndex !== -1) {
            const game = allGames[gameIndex];
            game.status = newStatus;

            // 如果是 POST 请求，更新 backlogId
            if (method === 'POST' && result.id) {
                game.backlogId = result.id;
            }
        }

        // 2. 局部刷新 DOM
        const oldCard = gameListUl.querySelector(`.game-item-card[data-appid="${appId}"]`);
        if (oldCard) {
            const updatedGameData = allGames[gameIndex]; // 使用更新后的数据
            const newCard = renderGameCard(updatedGameData);
            gameListUl.replaceChild(newCard, oldCard);
        }

        // 3. 异步刷新图表 (图表数据依赖后端数据，需要重新获取)
        // 不等待其完成，实现快速响应
        renderPlaytimeChart();

    } catch (error) {
        alert(`Status update failed: ${error.message}`);
        console.error('Backlog update error:', error);
    }
};


/**
 * 渲染单个游戏卡片
 */
const renderGameCard = (game) => {
    const li = document.createElement('li');
    li.className = 'game-item-card';
    li.setAttribute('data-appid', game.appId);
    li.setAttribute('data-backlogid', game.backlogId || '');

    const cleanStatus = game.status ? game.status.replace(/\s/g, '') : '';
    const statusClass = game.status ? `status-${cleanStatus}` : 'status-unmarked';
    const playtimeHours = Math.round(game.playtimeMinutes / 60);
    const ratingDisplay = game.userRating ? `⭐️ ${game.userRating}/10` : 'Not Rated';
    const statusDisplay = game.status || '';

    const imageUrls = [
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
        `https://steamcdn-a.akamaihd.net/steam/apps/${game.appId}/header.jpg`,
        `https://cdn.akamai.steamstatic.com/steam/apps/${game.appId}/header.jpg`

    ];

    const statuses = ['Planning', 'Playing', 'Completed'];
    const statusOptionsHtml = statuses.map(status => `
        <option value="${status.replace(/\s/g, '')}" ${cleanStatus === status.replace(/\s/g, '') ? 'selected' : ''}>${status}</option>
    `).join('');

    const hasStatus = game.status && game.status !== 'Not Started' && game.status !== null;
    const optionsHtml = hasStatus
        ? statusOptionsHtml
        : `<option value="" ${!hasStatus ? 'selected disabled' : ''}>-- Set Status --</option>${statusOptionsHtml}`;


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

    const selector = li.querySelector('.status-selector');
    if (selector) {
        selector.addEventListener('change', (e) => {
            const newStatus = e.target.value;
            const appId = e.target.getAttribute('data-appid');
            const backlogId = e.target.getAttribute('data-backlogid');
            updateGameStatus(appId, backlogId, newStatus);
        });
    }

    const imgElement = li.querySelector('.game-cover-image');
    const placeholderElement = li.querySelector('.game-image-placeholder');
    let currentFallbackIndex = 0;

    if (imgElement) {
        imgElement.addEventListener('error', function() {
            const fallbackUrls = JSON.parse(this.getAttribute('data-fallback-urls') || '[]');
            if (currentFallbackIndex < fallbackUrls.length) {
                this.src = fallbackUrls[currentFallbackIndex];
                currentFallbackIndex++;
            } else {
                this.style.display = 'none';
                if (placeholderElement) placeholderElement.style.display = 'flex';
            }
        });
    }

    return li;
};

/**
 * Filter and render games based on selected filter
 */
export const renderFilteredGames = () => {
    const filterValue = gameFilterSelect.value;
    gameListUl.innerHTML = '';

    let filteredGames = allGames;

    switch (filterValue) {
        case 'never-played':
            filteredGames = allGames.filter(game => game.playtimeMinutes === 0);
            break;
        case 'over-50h':
            filteredGames = allGames.filter(game => game.playtimeMinutes > 3000); // 50 hours
            break;
        case 'over-100h':
            filteredGames = allGames.filter(game => game.playtimeMinutes > 6000); // 100 hours
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
 * 客户端：显示 API Key 输入模态框
 */
export const showApiKeyModal = () => {
    apiKeyKeyInput.value = '';
    apiKeyModal.style.display = 'flex';
    apiKeyModal.setAttribute('aria-hidden', 'false');
};

/**
 * 客户端：处理 API Key 保存操作
 */
const handleApiKeySave = async () => {
    const userId = window.CURRENT_USER_ID;
    const apiKey = apiKeyKeyInput.value.trim();

    if (!userId || !apiKey) {
        alert('User ID and API Key are required.');
        return;
    }

    // 禁用按钮防止重复点击
    apiKeySaveBtn.disabled = true;
    apiKeySaveBtn.textContent = 'Saving...';

    try {
        // 修正: 客户端请求 API Key 存储路由
        const url = `${API_BASE_URL}/user/${userId}/apikey`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey }),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.message || 'Failed to save API Key.');
        }

        // 保存成功，隐藏模态框并重试同步
        apiKeyModal.style.display = 'none';
        apiKeyModal.setAttribute('aria-hidden', 'true');
        displayAuthMessage('Steam API Key saved successfully. Retrying sync...', false);

        // 📌 核心：重试同步
        await syncLibraryData();

    } catch (error) {
        console.error('API Key save error:', error);
        alert(`Error saving API Key: ${error.message}`);
    } finally {
        apiKeySaveBtn.disabled = false;
        apiKeySaveBtn.textContent = 'Save';
    }
};

/**
 * 客户端：获取游戏库数据并渲染列表
 */
export const syncLibraryData = async () => {
    syncLibraryBtn.disabled = true;
    syncLibraryBtn.textContent = '🔄 Syncing...';
    gameListUl.innerHTML = '<p class="message" style="color:var(--color-text-muted);">Fetching Steam library...</p>';

    try {
        // 尝试从全局变量中获取当前用户 ID。
        const currentUserId = window.CURRENT_USER_ID;

        if (!currentUserId) {
            throw new Error('User ID not found. Please log in again.');
        }

        const response = await fetch(`${API_BASE_URL}/library/sync`);
        if (!response.ok) {
            let result = null;
            let message = 'Failed to sync library.';
            let isMissingKey = false;

            try {
                // 尝试解析后端返回的 JSON 错误体
                result = await response.json();
                message = (result && (result.message || result.error)) || message;

                // 📌 核心修正点: 检查状态码 403 和自定义错误码 E_MISSING_STEAM_API_KEY
                if (response.status === 403 && result && result.errorCode === 'E_MISSING_STEAM_API_KEY') {
                    isMissingKey = true;
                }

            } catch (e) {
                // 后端返回非 JSON，根据状态码判断
                if (response.status === 403) {
                    message = 'Access Forbidden (Steam account private or API Key missing).';
                }
            }


            // 如果是 API Key 缺失
            if (isMissingKey) {
                // 显示 API Key 模态框
                showApiKeyModal(currentUserId);
                // 必须在此处中断同步流程，防止进入 finally block
                return;
            }

            // 抛出最终的错误信息
            throw new Error(message);
        }

        const games = await response.json();
        allGames.splice(0, allGames.length, ...(Array.isArray(games) ? games : []));

        if (!games || games.length === 0) {
            gameListUl.innerHTML = '<p class="message" style="color:var(--color-text-muted);">No games found or your Steam account is private.</p>';
        } else {
            renderFilteredGames();
        }

        renderPlaytimeChart();

    } catch (error) {
        gameListUl.innerHTML = `<p class="message" style="color:var(--color-error);">Sync error: ${error.message}</p>`;
        console.error('Library sync error:', error);
    } finally {
        // 修正: 只有当不是因为弹窗中断时才执行
        if(apiKeyModal.style.display !== 'flex') {
            syncLibraryBtn.disabled = false;
            syncLibraryBtn.textContent = '🔄 Sync Library';
        }
    }
};

/**
 * 初始化：绑定按钮与过滤器
 */
export const initLibrary = () => {
    // 修正: 移除冗余的 syncLibraryBtn 监听，保留在 app.js 中绑定到 loadDashboard
    if (gameFilterSelect) {
        gameFilterSelect.addEventListener('change', () => {
            renderFilteredGames();
        });
    }

    // 📌 修正点 4: 绑定模态框事件
    if (apiKeySaveBtn) {
        apiKeySaveBtn.addEventListener('click', handleApiKeySave);
    }
    if (apiKeyCancelBtn) {
        apiKeyCancelBtn.addEventListener('click', () => {
            apiKeyModal.style.display = 'none';
            apiKeyModal.setAttribute('aria-hidden', 'true');
            gameListUl.innerHTML = '<p class="message" style="color:var(--color-error);">Synchronization cancelled. Please provide the Steam API Key to sync the library.</p>';
        });
    }

    // 初次渲染（若有本地数据）
    renderFilteredGames();
};