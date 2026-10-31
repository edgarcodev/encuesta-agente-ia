(function() {
    'use strict';

    const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    const BATCH_SIZE = 1000;

    async function fetchAllResponses(tipo, dateFilter) {
        let allRows = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            let query = supabase
                .from('respuestas_encuesta')
                .select('id, tipo_encuesta, created_at, datos')
                .order('created_at', { ascending: true })
                .range(offset, offset + BATCH_SIZE - 1);

            if (tipo !== 'todos') {
                query = query.eq('tipo_encuesta', tipo);
            }

            if (dateFilter && dateFilter.from) {
                query = query.gte('created_at', dateFilter.from + 'T00:00:00');
            }
            if (dateFilter && dateFilter.to) {
                query = query.lte('created_at', dateFilter.to + 'T23:59:59');
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching responses:', error);
                return [];
            }

            allRows = allRows.concat(data || []);
            hasMore = (data && data.length === BATCH_SIZE);
            offset += BATCH_SIZE;
        }

        return allRows;
    }

    function flattenValue(val) {
        if (val === null || val === undefined) return '';
        if (Array.isArray(val)) return val.join(';');
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    }

    function collectAllKeys(rows) {
        const keys = new Set();
        for (const row of rows) {
            const datos = row.datos || {};
            for (const key of Object.keys(datos)) {
                if (key === '_metadata') {
                    const meta = datos._metadata || {};
                    for (const mk of Object.keys(meta)) {
                        keys.add('_metadata.' + mk);
                    }
                } else if (key === '_geo') {
                    const geo = datos._geo || {};
                    for (const gk of Object.keys(geo)) {
                        keys.add('_geo.' + gk);
                    }
                } else {
                    keys.add(key);
                }
            }
        }
        return Array.from(keys);
    }

    function buildHeaders(questionKeys) {
        return ['id', 'tipo_encuesta', 'created_at', 'tiempo_total_segundos', ...questionKeys];
    }

    function rowToRecord(row, questionKeys) {
        const datos = row.datos || {};
        const record = {
            id: row.id,
            tipo_encuesta: row.tipo_encuesta || '',
            created_at: row.created_at || '',
            tiempo_total_segundos: datos._metadata?.tiempo_total_segundos ?? ''
        };

        for (const key of questionKeys) {
            if (key.startsWith('_metadata.')) {
                const metaKey = key.replace('_metadata.', '');
                record[key] = flattenValue(datos._metadata?.[metaKey]);
            } else if (key.startsWith('_geo.')) {
                const geoKey = key.replace('_geo.', '');
                record[key] = flattenValue(datos._geo?.[geoKey]);
            } else {
                record[key] = flattenValue(datos[key]);
            }
        }

        return record;
    }

    function escapeCSV(val) {
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    function toCSV(headers, records) {
        const headerRow = headers.map(escapeCSV).join(',');
        const dataRows = records.map(record =>
            headers.map(h => escapeCSV(record[h] ?? '')).join(',')
        );
        return [headerRow, ...dataRows].join('\n');
    }

    function downloadCSV(content, filename) {
        const bom = '\uFEFF';
        const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function buildFilename(tipo) {
        const tipoLabel = tipo === 'todos' ? 'todas' : tipo;
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        return `respuestas_${tipoLabel}_${date}.csv`;
    }

    async function exportResponses(tipo, dateFilter, onStatus) {
        onStatus('Cargando datos...');

        const rows = await fetchAllResponses(tipo, dateFilter);

        if (rows.length === 0) {
            onStatus('No hay datos para exportar.', true);
            return;
        }

        onStatus(`Procesando ${rows.length} registros...`);

        const questionKeys = collectAllKeys(rows);
        const headers = buildHeaders(questionKeys);
        const records = rows.map(row => rowToRecord(row, questionKeys));
        const csvContent = toCSV(headers, records);
        const filename = buildFilename(tipo);

        onStatus('Descargando...');
        downloadCSV(csvContent, filename);
        onStatus(`✅ ${rows.length} respuestas exportadas a ${filename}`, true);
    }

    window.dashboardExport = { exportResponses };
})();
