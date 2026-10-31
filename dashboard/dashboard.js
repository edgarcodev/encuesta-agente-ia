(function() {
    'use strict';

    const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    const PAGE_SIZE = 20;
    let allData = [];
    let currentPage = 1;

    async function requireAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '/login';
            return null;
        }
        return session;
    }

    async function signOut() {
        await supabase.auth.signOut();
        window.location.href = '/login';
    }

    function getDateFilter() {
        const range = document.getElementById('dateRangeSelect').value;
        if (range === 'all') return { from: null, to: null };
        if (range === 'custom') {
            const from = document.getElementById('dateFrom').value;
            const to = document.getElementById('dateTo').value;
            return {
                from: from || null,
                to: to || null
            };
        }
        const days = parseInt(range);
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - days);
        return {
            from: from.toISOString().split('T')[0],
            to: now.toISOString().split('T')[0]
        };
    }

    async function fetchData(tipo) {
        const dateFilter = getDateFilter();
        let query = supabase
            .from('respuestas_encuesta')
            .select('id, tipo_encuesta, created_at, datos')
            .order('created_at', { ascending: false });

        if (tipo !== 'todos') {
            query = query.eq('tipo_encuesta', tipo);
        }

        if (dateFilter.from) {
            query = query.gte('created_at', dateFilter.from + 'T00:00:00');
        }
        if (dateFilter.to) {
            query = query.lte('created_at', dateFilter.to + 'T23:59:59');
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching data:', error);
            return [];
        }
        return data || [];
    }

    function processRawData(rows) {
        const byTipo = {};
        const fuenteMap = {};
        const dispositivoMap = {};
        const p1Map = {};
        const dayMap = {};

        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dayMap[key] = 0;
        }

        const today = now.toISOString().split('T')[0];
        let hoyCount = 0;
        let tiempos = [];

        for (const row of rows) {
            const t = row.tipo_encuesta || 'sin_tipo';
            byTipo[t] = (byTipo[t] || 0) + 1;

            const day = row.created_at ? row.created_at.split('T')[0] : null;
            if (day && dayMap[day] !== undefined) dayMap[day]++;
            if (day === today) hoyCount++;

            const datos = row.datos || {};
            const meta = datos._metadata || {};

            const fuente = meta.fuente || 'directo';
            fuenteMap[fuente] = (fuenteMap[fuente] || 0) + 1;

            const disp = meta.dispositivo || 'desconocido';
            dispositivoMap[disp] = (dispositivoMap[disp] || 0) + 1;

            const p1 = datos.p1;
            if (Array.isArray(p1)) {
                for (const val of p1) p1Map[val] = (p1Map[val] || 0) + 1;
            } else if (typeof p1 === 'string') {
                p1Map[p1] = (p1Map[p1] || 0) + 1;
            }

            if (meta.tiempo_total_segundos != null) tiempos.push(meta.tiempo_total_segundos);
        }

        const porDia = Object.entries(dayMap).map(([day, count]) => ({ day, count }));
        const fuente = Object.entries(fuenteMap).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
        const dispositivo = Object.entries(dispositivoMap).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
        const p1 = Object.entries(p1Map).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
        const promedio = tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : null;

        return { byTipo, porDia, fuente, dispositivo, p1, total: rows.length, hoy: hoyCount, promedio };
    }

    function updateKPIs(data) {
        document.getElementById('kpiTotal').textContent = data.total.toLocaleString();
        document.getElementById('kpiHoy').textContent = data.hoy.toLocaleString();
        document.getElementById('kpiPromedio').textContent = data.promedio ? `${data.promedio}s` : '--';
    }

    function renderResponses(page) {
        const tbody = document.getElementById('responsesBody');
        if (!tbody) return;

        const start = (page - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageData = allData.slice(start, end);

        tbody.innerHTML = pageData.map(row => {
            const datos = row.datos || {};
            const p1 = datos.p1;
            let p1Display = '';
            if (Array.isArray(p1)) p1Display = p1.slice(0, 3).join('; ') + (p1.length > 3 ? '...' : '');
            else if (typeof p1 === 'string') p1Display = p1.slice(0, 50);
            const tiempo = datos._metadata?.tiempo_total_segundos;
            const fecha = row.created_at ? row.created_at.split('T')[0] : '';

            return `<tr>
                <td>${row.id}</td>
                <td><span class="badge badge-${row.tipo_encuesta || 'otro'}">${row.tipo_encuesta || '—'}</span></td>
                <td>${fecha}</td>
                <td>${tiempo ? tiempo + 's' : '—'}</td>
                <td class="text-ellipsis" title="${p1Display || '—'}">${p1Display || '—'}</td>
            </tr>`;
        }).join('');

        renderPagination(page);
    }

    function renderPagination(page) {
        const container = document.getElementById('pagination');
        if (!container) return;

        const totalPages = Math.ceil(allData.length / PAGE_SIZE);
        if (totalPages <= 1) { container.innerHTML = ''; return; }

        let html = '<div class="pagination-inner">';
        html += `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="window.__goToPage(${page - 1})">←</button>`;
        html += `<span class="page-info">${page} / ${totalPages}</span>`;
        html += `<button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="window.__goToPage(${page + 1})">→</button>`;
        html += '</div>';
        container.innerHTML = html;
    }

    window.__goToPage = function(page) {
        currentPage = page;
        renderResponses(page);
    };

    async function loadDashboard() {
        const loading = document.getElementById('loadingState');
        const empty = document.getElementById('emptyState');
        const charts = document.querySelector('.chart-grid');
        const tableWrapper = document.querySelector('.responses-table-wrapper');

        loading.style.display = 'block';
        empty.style.display = 'none';
        if (charts) charts.style.opacity = '0.5';
        if (tableWrapper) tableWrapper.style.opacity = '0.5';

        const tipoSelect = document.getElementById('tipoSelect');
        const tipo = tipoSelect ? tipoSelect.value : 'todos';
        allData = await fetchData(tipo);
        currentPage = 1;

        loading.style.display = 'none';
        if (charts) charts.style.opacity = '1';
        if (tableWrapper) tableWrapper.style.opacity = '1';

        if (allData.length === 0) {
            empty.style.display = 'block';
            updateKPIs({ total: 0, hoy: 0, promedio: null });
            window.dashboardCharts.updateCharts({ byTipo: {}, porDia: [], fuente: [], dispositivo: [], p1: [] });
            renderResponses(1);
            return;
        }

        const data = processRawData(allData);
        updateKPIs(data);
        window.dashboardCharts.updateCharts(data);
        renderResponses(1);
    }

    function setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                document.getElementById(tabId === 'charts' ? 'tabCharts' : 'tabResponses').classList.add('active');
            });
        });
    }

    function setupDateFilter() {
        const rangeSelect = document.getElementById('dateRangeSelect');
        const customInputs = document.getElementById('customDateInputs');

        rangeSelect.addEventListener('change', () => {
            customInputs.style.display = rangeSelect.value === 'custom' ? 'flex' : 'none';
            if (rangeSelect.value !== 'custom') loadDashboard();
        });

        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        if (dateFrom) dateFrom.addEventListener('change', loadDashboard);
        if (dateTo) dateTo.addEventListener('change', loadDashboard);
    }

    async function init() {
        const session = await requireAuth();
        if (!session) return;

        const app = document.getElementById('app');
        if (app) app.style.display = '';

        const emailEl = document.getElementById('userEmail');
        if (emailEl && session.user.email) emailEl.textContent = session.user.email;

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', signOut);

        const exportBtn = document.getElementById('exportBtn');
        const exportStatus = document.getElementById('exportStatus');
        if (exportBtn && window.dashboardExport) {
            exportBtn.addEventListener('click', async function() {
                const tipo = document.getElementById('tipoSelect').value;
                exportBtn.disabled = true;
                if (exportStatus) {
                    exportStatus.style.display = 'block';
                    exportStatus.className = 'export-status';
                }
                try {
                    await window.dashboardExport.exportResponses(tipo, getDateFilter(), function(msg, isFinal) {
                        if (exportStatus) {
                            exportStatus.textContent = msg;
                            exportStatus.className = 'export-status' + (isFinal ? (msg.startsWith('✅') ? ' success' : ' error') : '');
                            if (isFinal) setTimeout(() => { exportStatus.style.display = 'none'; }, 5000);
                        }
                    });
                } catch (err) {
                    if (exportStatus) {
                        exportStatus.textContent = '❌ Error al exportar: ' + err.message;
                        exportStatus.className = 'export-status error';
                        setTimeout(() => { exportStatus.style.display = 'none'; }, 5000);
                    }
                } finally {
                    exportBtn.disabled = false;
                }
            });
        }

        window.dashboardCharts.init();
        setupTabs();
        setupDateFilter();

        const tipoSelect = document.getElementById('tipoSelect');
        if (tipoSelect) tipoSelect.addEventListener('change', loadDashboard);

        await loadDashboard();
    }

    window.addEventListener('load', init);
})();
