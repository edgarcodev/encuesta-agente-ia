(function() {
    'use strict';

    let chartTipo = null;
    let chartDia = null;
    let chartP1 = null;
    let chartFuente = null;
    let chartDispositivo = null;

    const COLORS = {
        primary: '#3b82f6',
        secondary: '#f97316',
        accent: '#22c55e',
        neutral: '#94a3b8',
        grid: 'rgba(148, 163, 184, 0.2)',
        text: '#5b6f82'
    };

    function init() {
        const ctxTipo = document.getElementById('chartTipo');
        const ctxDia = document.getElementById('chartDia');
        const ctxP1 = document.getElementById('chartP1');
        const ctxFuente = document.getElementById('chartFuente');
        const ctxDispositivo = document.getElementById('chartDispositivo');

        const baseOptions = {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: COLORS.text } },
                y: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { color: COLORS.text } }
            }
        };

        if (ctxTipo) {
            chartTipo = new Chart(ctxTipo, {
                type: 'bar',
                data: { labels: [], datasets: [{ label: 'Respuestas', data: [], backgroundColor: [COLORS.primary, COLORS.secondary, COLORS.accent] }] },
                options: baseOptions
            });
        }

        if (ctxDia) {
            chartDia = new Chart(ctxDia, {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Respuestas', data: [], borderColor: COLORS.primary, backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
                options: baseOptions
            });
        }

        if (ctxP1) {
            chartP1 = new Chart(ctxP1, {
                type: 'doughnut',
                data: { labels: [], datasets: [{ data: [], backgroundColor: generateColors(20) }] },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { position: 'right', labels: { color: COLORS.text, font: { size: 12 } } } },
                    cutout: '60%'
                }
            });
        }

        if (ctxFuente) {
            chartFuente = new Chart(ctxFuente, {
                type: 'bar',
                data: { labels: [], datasets: [{ label: 'Respuestas', data: [], backgroundColor: generateColors(10), indexAxis: 'y' }] },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { color: COLORS.text } },
                        y: { grid: { display: false }, ticks: { color: COLORS.text } }
                    }
                }
            });
        }

        if (ctxDispositivo) {
            chartDispositivo = new Chart(ctxDispositivo, {
                type: 'doughnut',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [COLORS.primary, COLORS.secondary, '#8b5cf6', COLORS.neutral] }] },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { position: 'right', labels: { color: COLORS.text, font: { size: 12 } } } },
                    cutout: '60%'
                }
            });
        }
    }

    function updateCharts(data) {
        if (chartTipo) {
            const tipoLabels = Object.keys(data.byTipo);
            const tipoValues = Object.values(data.byTipo);
            chartTipo.data.labels = tipoLabels;
            chartTipo.data.datasets[0].data = tipoValues;
            chartTipo.update();
        }

        if (chartDia) {
            chartDia.data.labels = data.porDia.map(d => d.day);
            chartDia.data.datasets[0].data = data.porDia.map(d => d.count);
            chartDia.update();
        }

        if (chartP1) {
            const topItems = data.p1.slice(0, 15);
            chartP1.data.labels = topItems.map(item => item.value);
            chartP1.data.datasets[0].data = topItems.map(item => item.count);
            chartP1.update();
        }

        if (chartFuente) {
            chartFuente.data.labels = data.fuente.map(f => f.value);
            chartFuente.data.datasets[0].data = data.fuente.map(f => f.count);
            chartFuente.update();
        }

        if (chartDispositivo) {
            chartDispositivo.data.labels = data.dispositivo.map(d => d.value);
            chartDispositivo.data.datasets[0].data = data.dispositivo.map(d => d.count);
            chartDispositivo.update();
        }
    }

    function generateColors(n) {
        const palette = [
            '#3b82f6', '#f97316', '#22c55e', '#eab308', '#ec4899',
            '#8b5cf6', '#06b6d4', '#f43f5e', '#14b8a6', '#84cc16',
            '#6366f1', '#ef4444', '#10b981', '#f59e0b', '#a855f7',
            '#0ea5e9', '#d946ef', '#22d3ee', '#84cc16', '#fbbf24'
        ];
        const colors = [];
        for (let i = 0; i < n; i++) {
            colors.push(palette[i % palette.length]);
        }
        return colors;
    }

    window.dashboardCharts = { init, updateCharts };
})();
