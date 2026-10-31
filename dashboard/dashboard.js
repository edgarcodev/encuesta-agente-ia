(function() {
    'use strict';

    const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

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

    async function fetchData(tipo) {
        let query = supabase
            .from('respuestas_encuesta')
            .select('id, tipo_encuesta, created_at, datos')
            .order('created_at', { ascending: true });

        if (tipo !== 'todos') {
            query = query.eq('tipo_encuesta', tipo);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching data:', error);
            return null;
        }

        return data || [];
    }

    function processRawData(rows) {
        // 1. Count by tipo
        const byTipo = {};
        for (const row of rows) {
            const t = row.tipo_encuesta || 'sin_tipo';
            byTipo[t] = (byTipo[t] || 0) + 1;
        }

        // 2. Count by day (last 30 days)
        const dayMap = {};
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dayMap[key] = 0;
        }
        for (const row of rows) {
            const day = row.created_at ? row.created_at.split('T')[0] : null;
            if (day && dayMap[day] !== undefined) {
                dayMap[day]++;
            }
        }
        const porDia = Object.entries(dayMap).map(([day, count]) => ({ day, count }));

        // 3. P1 answers — flatten checkbox arrays
        const p1Map = {};
        for (const row of rows) {
            const p1 = row.datos?.p1;
            if (Array.isArray(p1)) {
                for (const val of p1) {
                    p1Map[val] = (p1Map[val] || 0) + 1;
                }
            } else if (typeof p1 === 'string') {
                p1Map[p1] = (p1Map[p1] || 0) + 1;
            }
        }
        const p1 = Object.entries(p1Map)
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count);

        // 4. KPIs
        const total = rows.length;
        const today = new Date().toISOString().split('T')[0];
        const hoy = rows.filter(r => r.created_at && r.created_at.startsWith(today)).length;
        const tiempos = rows.map(r => r.datos?._metadata?.tiempo_total_segundos).filter(t => t != null);
        const promedio = tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : null;

        return { byTipo, porDia, p1, total, hoy, promedio };
    }

    function updateKPIs(data) {
        document.getElementById('kpiTotal').textContent = data.total.toLocaleString();
        document.getElementById('kpiHoy').textContent = data.hoy.toLocaleString();
        document.getElementById('kpiPromedio').textContent = data.promedio ? `${data.promedio}s` : '--';
    }

    async function loadDashboard(tipo) {
        const loading = document.getElementById('loadingState');
        const empty = document.getElementById('emptyState');
        const charts = document.querySelector('.chart-grid');

        loading.style.display = 'block';
        empty.style.display = 'none';
        if (charts) charts.style.opacity = '0.5';

        const rows = await fetchData(tipo);

        loading.style.display = 'none';
        if (charts) charts.style.opacity = '1';

        if (!rows || rows.length === 0) {
            empty.style.display = 'block';
            updateKPIs({ total: 0, hoy: 0, promedio: null });
            window.dashboardCharts.updateCharts({ byTipo: {}, porDia: [], p1: [] });
            return;
        }

        const data = processRawData(rows);
        updateKPIs(data);
        window.dashboardCharts.updateCharts(data);
    }

    async function init() {
        const session = await requireAuth();
        if (!session) return;

        // Show app
        const app = document.getElementById('app');
        if (app) app.style.display = '';

        // Show user email
        const emailEl = document.getElementById('userEmail');
        if (emailEl && session.user.email) {
            emailEl.textContent = session.user.email;
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', signOut);

        // Init charts
        window.dashboardCharts.init();

        // Load data
        const tipoSelect = document.getElementById('tipoSelect');
        const tipo = tipoSelect ? tipoSelect.value : 'todos';
        await loadDashboard(tipo);

        // Listen for changes
        if (tipoSelect) {
            tipoSelect.addEventListener('change', () => loadDashboard(tipoSelect.value));
        }
    }

    window.addEventListener('load', init);
})();
