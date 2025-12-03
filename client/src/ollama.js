// client/src/ollama.js
// Ollama AI Integration Module

import { API_BASE_URL } from './constants.js';
import { playerProfileEl, lifeBalanceEl } from './donElements.js';

/**
 * Generate AI Insights using Ollama
 * Calls both profile and balance APIs in parallel for better performance
 */
export const generateAIInsights = async () => {
    // Show loading state
    playerProfileEl.innerHTML = '<span class="loading-text">🤖 Analyzing your gaming profile...</span>';
    lifeBalanceEl.innerHTML = '<span class="loading-text">⚖️ Calculating life balance...</span>';

    try {
        // Call Profile and Balance APIs in parallel
        const [profileRes, balanceRes] = await Promise.all([
            fetch(`${API_BASE_URL}/ollama/profile`, { method: 'POST' }),
            fetch(`${API_BASE_URL}/ollama/balance`, { method: 'POST' })
        ]);

        // Handle Profile Response
        if (profileRes.ok) {
            const data = await profileRes.json();
            playerProfileEl.textContent = data.response || 'No profile generated.';
        } else {
            playerProfileEl.textContent = 'Unable to generate profile. Is Ollama running?';
        }

        // Handle Balance Response
        if (balanceRes.ok) {
            const data = await balanceRes.json();
            lifeBalanceEl.textContent = data.response || 'No recommendation generated.';
        } else {
            lifeBalanceEl.textContent = 'Unable to generate balance recommendation.';
        }

    } catch (error) {
        console.error('AI Generation Error:', error);
        playerProfileEl.textContent = 'AI Service Unavailable. Ensure Ollama is running.';
        lifeBalanceEl.textContent = 'AI Service Unavailable.';
    }
};

