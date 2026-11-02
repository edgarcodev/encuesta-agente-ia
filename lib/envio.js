// ================================================================
// ENVÍO — payload construction and sending logic
// ================================================================

/**
 * Builds the data payload to send to the survey API.
 * Pure function — all dependencies are passed as parameters.
 *
 * @param {object} answers - Map of question IDs to values
 * @param {boolean} allowMetadata - Whether to include navigation data
 * @param {object} metadata - { fuente, dispositivo, inicio, fin, tiempos_por_pregunta, conexion, navegador, plataforma }
 * @param {object|null} geo - Geo data object (city, country, etc.) or null
 * @param {number} startTime - Survey start time (Date.now() or timestamp)
 * @returns {object} dataToSend object ready for API submission
 */
export function buildSendPayload(answers, allowMetadata, metadata, geo, startTime) {
    const dataToSend = {};
    for (const key in answers) {
        if (answers[key] !== undefined && answers[key] !== null && answers[key] !== '') {
            dataToSend[key] = answers[key];
        }
    }

    const fin = metadata.fin || new Date();
    const start = new Date(startTime);
    const tiempoTotal = Math.round((fin - start) / 1000);

    if (allowMetadata) {
        dataToSend._metadata = {
            fuente: metadata.fuente,
            dispositivo: metadata.dispositivo,
            inicio: start.toISOString(),
            fin: fin.toISOString(),
            tiempo_total_segundos: tiempoTotal,
            tiempos_por_pregunta: metadata.tiempos_por_pregunta || {},
            conexion: metadata.conexion || {},
            navegador: metadata.navegador,
            plataforma: metadata.plataforma || 'desconocida'
        };
        if (geo) dataToSend._geo = geo;
    } else {
        dataToSend._metadata = { tiempo_total_segundos: tiempoTotal };
    }

    return dataToSend;
}

/**
 * Constructs the full POST body for the survey API.
 *
 * @param {object} dataToSend - Payload from buildSendPayload
 * @param {string} nonce - Auth token/nonce
 * @param {string} tipoEncuesta - Survey type ('compradores', 'vendedores', etc.)
 * @returns {string} JSON string for the request body
 */
export function buildRequestBody(dataToSend, nonce, tipoEncuesta) {
    return JSON.stringify({
        datos: dataToSend,
        token: nonce,
        tipo_encuesta: tipoEncuesta
    });
}

/**
 * Handles the API response.
 *
 * @param {Response} res - Fetch response
 * @returns {Promise<object>} { success: true, data } or { success: false, error: string }
 */
export async function handleApiResponse(res) {
    if (!res.ok) {
        const t = await res.text();
        let msg;
        try { msg = JSON.parse(t).error || `Error ${res.status}`; }
        catch (e) { msg = `Error ${res.status}: ${t || res.statusText}`; }
        throw new Error(msg);
    }
    const t = await res.text();
    if (!t) return {};
    try { return JSON.parse(t); } catch (e) { return { success: true }; }
}

/**
 * Resolves the nonce from the survey configuration.
 *
 * @param {object} encuestaActiva - Active survey config
 * @param {Storage} sessionStorage - Browser sessionStorage
 * @returns {string} The nonce value
 */
export function resolveNonce(encuestaActiva, sessionStorage) {
    return encuestaActiva.NONCE_KEY
        ? (sessionStorage.getItem(encuestaActiva.NONCE_KEY) || '')
        : (encuestaActiva.NONCE || '');
}

/**
 * Sends survey responses to the API.
 *
 * @param {object} options - All dependencies as parameters
 * @param {object} options.answers - Map of question IDs to values
 * @param {boolean} options.allowMetadata - Include navigation data
 * @param {object} options.metadata - Navigation metadata
 * @param {object|null} options.geo - Geo data or null
 * @param {number} options.startTime - Survey start timestamp
 * @param {object} options.encuestaActiva - Active survey config
 * @param {string} options.nonce - Auth token
 * @param {Function} options.fetchFn - Fetch function (injectable for testing)
 * @param {Storage} options.localStorage - localStorage (injectable for testing)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function sendSurveyResponse({
    answers,
    allowMetadata,
    metadata,
    geo,
    startTime,
    encuestaActiva,
    nonce,
    fetchFn = globalThis.fetch,
    localStorage = globalThis.localStorage
}) {
    const dataToSend = buildSendPayload(answers, allowMetadata, metadata, geo, startTime);
    const body = buildRequestBody(dataToSend, nonce, encuestaActiva.tipo);

    try {
        const res = await fetchFn(encuestaActiva.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });
        const data = await handleApiResponse(res);
        try { localStorage.setItem(encuestaActiva.STORAGE_KEY, 'true'); } catch (e) {}
        return { success: true, data };
    } catch (error) {
        console.error('❌ Error al enviar:', error);
        return { success: false, error: error.message };
    }
}
