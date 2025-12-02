import { API_BASE_URL, playtimeChartInstance, setPlaytimeChartInstance } from './constants.js';
import { getChartTextColor } from './utils.js';
import { playtimeChartCanvas } from './donElements.js';

/**
 * 渲染游戏时间分布图表
 */
export const renderPlaytimeChart = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/charts/playtime`);
        if (!response.ok) {
            throw new Error('Failed to fetch chart data');
        }
        const data = await response.json();

        if (playtimeChartInstance) {
            playtimeChartInstance.destroy();
        }

        const textColor = getChartTextColor();

        // Chart.js 假定在全局范围内可用
        const newChartInstance = new Chart(playtimeChartCanvas, {
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
                            font: { size: 11 }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Top 15 Games by Playtime',
                        color: textColor,
                        font: { size: 14, weight: 'bold' }
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
        setPlaytimeChartInstance(newChartInstance);

    } catch (error) {
        console.error('Chart rendering failed:', error);
        playtimeChartCanvas.innerHTML = '<p style="color:var(--color-error);">Unable to load chart data.</p>';
    }
};