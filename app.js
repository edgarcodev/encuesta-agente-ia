(function() {
    'use strict';

    // ================================================================
    // ENCUESTAS — configuración por tipo (sin preguntas)
    // ================================================================

    const peruLocalidades = [
        'Lima Metropolitana / Callao', 'Arequipa', 'Trujillo',
        'Piura', 'Chiclayo', 'Cusco', 'Ica', 'Huaraz',
        'Chimbote', 'Nuevo Chimbote', 'Coishco', 'Santa',
        'Nepeña', 'Moro', 'Casma', 'Huarmey', 'Chao', 'Virú',
        'Otra localidad de Áncash',
        'Otra localidad de la costa peruana',
        'Otra localidad de la sierra peruana',
        'Otra localidad de la selva peruana',
        'Principalmente compro por Internet'
    ];

    const ENCUESTAS = {
        compradores: {
            tipo: 'compradores',
            titulo: '📦 Investigación Comercial',
            endpoint: '/api/encuesta',
            color: '#3b82f6',
            STORAGE_KEY: 'megaremates_encuesta_enviada',
            NONCE: 'f8fc62c3199a7c297b576ac9aadb9a52',
            questionsUrl: '/config/preguntas/compradores.json'
        },
        vendedores: {
            tipo: 'vendedores',
            titulo: '📦 Mega Remates · Vendedores',
            endpoint: '/api/encuesta',
            color: '#f97316',
            STORAGE_KEY: 'megaremates_encuesta_vendedores_enviada',
            NONCE_KEY: 'encuesta_nonce_vendedores',
            questionsUrl: '/config/preguntas/vendedores.json'
        }
    };

    // ================================================================
    // CONDITION ENGINE — evaluador declarativo sin eval()
    // ================================================================

    function evaluateCondition(cond, answers) {
        if (cond.always) return true;

        // AND logic
        if (cond.logic === 'and' && Array.isArray(cond.conditions)) {
            return cond.conditions.every(c => evaluateCondition(c, answers));
        }
        // OR logic
        if (cond.logic === 'or' && Array.isArray(cond.conditions)) {
            return cond.conditions.some(c => evaluateCondition(c, answers));
        }

        const val = answers[cond.field];

        switch (cond.operator) {
            case 'equals':
                return val === cond.value;
            case 'notEquals':
                return val !== cond.value;
            case 'oneOf':
                return Array.isArray(cond.value) && cond.value.includes(val);
            case 'includes':
                return Array.isArray(val) && val.includes(cond.value);
            case 'notIncludes':
                return Array.isArray(val) && !val.includes(cond.value);
            default:
                return true;
        }
    }

    // ================================================================
    // DYNAMIC DEFINITION ENGINE
    // ================================================================

    function applyDynamicDefinition(rawStep, answers) {
        if (!rawStep.dynamicDefinition) return rawStep;

        const dd = rawStep.dynamicDefinition;
        let match = false;

        if (dd.logic === 'and' && Array.isArray(dd.conditions)) {
            match = dd.conditions.every(c => evaluateCondition(c, answers));
        } else if (dd.when) {
            const fieldVal = answers[dd.field];
            if (dd.when.operator === 'equals') {
                match = fieldVal === dd.when.value;
            } else if (dd.when.operator === 'oneOf') {
                match = dd.when.value.includes(fieldVal);
            }
        }

        const variant = match ? dd.then : dd.else;
        return Object.assign({}, rawStep, variant);
    }

    // ================================================================
    // PARSE QUESTIONS — JSON → steps con condition() y getDefinition()
    // ================================================================

    function parseQuestions(rawQuestions) {
        return rawQuestions.map(raw => {
            const step = Object.assign({}, raw);
            delete step.condition;
            delete step.dynamicDefinition;

            // Wrap condition
            step.condition = function() {
                return evaluateCondition(raw.condition, answers);
            };

            // Wrap dynamicDefinition
            if (raw.dynamicDefinition) {
                step.getDefinition = function() {
                    return applyDynamicDefinition(raw, answers);
                };
            }

            // Normalize options: convert string arrays to {label, value} objects
            if (Array.isArray(raw.options) && raw.options.length > 0 && typeof raw.options[0] === 'string') {
                step.options = raw.options.map(label => ({ label, value: label }));
            }

            return step;
        });
    }

    // ================================================================
    // ESTADO GLOBAL
    // ================================================================
    let encuestaActiva = null;
    let steps = [];
    const answers = {};
    let datosEnviados = false;
    let geoData = null;
    const inicioEncuesta = new Date();
    const tiemposPorPregunta = {};
    let preguntaActualId = null;
    let inicioPregunta = null;
    let fuente = 'desconocida';
    let dispositivo = 'desktop';
    let conexion = {};
    let currentStepIndex = 0;

    // ================================================================
    // HELPERS
    // ================================================================
    function resolveStep(step) {
        if (!step) return null;
        if (typeof step.getDefinition === 'function') {
            const def = step.getDefinition();
            return Object.assign({}, step, def);
        }
        return step;
    }

    function detectarDispositivo() {
        const ua = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
        if (/mobile|iphone|ipod|android|blackberry|windows phone/i.test(ua)) return 'celular';
        return 'laptop/PC';
    }

    function obtenerFuente() {
        const params = new URLSearchParams(window.location.search);
        const utm = params.get('utm_source');
        if (utm) return utm;
        try {
            const ref = document.referrer || '';
            if (ref.includes('facebook.com')) return 'Facebook';
            if (ref.includes('messenger.com')) return 'Messenger';
            if (ref.includes('whatsapp.com')) return 'WhatsApp';
            if (ref.includes('instagram.com')) return 'Instagram';
            if (ref.includes('tiktok.com')) return 'TikTok';
            if (ref.includes('youtube.com')) return 'YouTube';
            if (ref.includes('google.com')) return 'Google';
            if (ref.includes('twitter.com')) return 'Twitter';
            if (ref.includes('linkedin.com')) return 'LinkedIn';
            if (ref.includes('web.telegram.org')) return 'Telegram';
            return 'directo';
        } catch (e) { return 'desconocida'; }
    }

    function obtenerGeoData() {
        return fetch('https://ipapi.co/json/')
            .then(r => r.ok ? r.json() : null)
            .then(d => d ? {
                ip: d.ip || 'desconocida',
                ciudad: d.city || '',
                region: d.region || '',
                pais: d.country_name || '',
                lat: d.latitude || null,
                lon: d.longitude || null
            } : null)
            .catch(() => null);
    }

    function obtenerConexion() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) return {
            effectiveType: conn.effectiveType || 'unknown',
            downlink: conn.downlink || null,
            rtt: conn.rtt || null
        };
        return {};
    }

    // ================================================================
    // ENVÍO
    // ================================================================
    function enviarRespuestas(geo) {
        const dataToSend = {};
        for (const key in answers) {
            if (answers[key] !== undefined && answers[key] !== null && answers[key] !== '') {
                dataToSend[key] = answers[key];
            }
        }

        const fin = new Date();
        dataToSend._metadata = {
            fuente, dispositivo,
            inicio: inicioEncuesta.toISOString(),
            fin: fin.toISOString(),
            tiempo_total_segundos: Math.round((fin - inicioEncuesta) / 1000),
            tiempos_por_pregunta: tiemposPorPregunta,
            conexion,
            navegador: navigator.userAgent,
            plataforma: navigator.platform || 'desconocida'
        };
        if (geo) dataToSend._geo = geo;

        const nonce = encuestaActiva.NONCE_KEY
            ? (sessionStorage.getItem(encuestaActiva.NONCE_KEY) || '')
            : (encuestaActiva.NONCE || '');

        return fetch(encuestaActiva.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ datos: dataToSend, token: nonce, tipo_encuesta: encuestaActiva.tipo })
        })
        .then(async res => {
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
        })
        .then(data => {
            datosEnviados = true;
            try { localStorage.setItem(encuestaActiva.STORAGE_KEY, 'true'); } catch (e) {}
            return { success: true, data };
        })
        .catch(error => {
            console.error('❌ Error al enviar:', error);
            return { success: false, error: error.message };
        });
    }

    // ================================================================
    // NAVEGACIÓN
    // ================================================================
    function getVisibleSteps() { return steps.filter(s => s.condition()); }
    function getCurrentVisibleIndex() {
        const visible = getVisibleSteps();
        if (currentStepIndex >= visible.length) currentStepIndex = visible.length - 1;
        if (currentStepIndex < 0) currentStepIndex = 0;
        return currentStepIndex;
    }
    function getCurrentStep() {
        const visible = getVisibleSteps();
        return visible[getCurrentVisibleIndex()] || null;
    }

    function saveCurrentAnswer() {
        const step = getCurrentStep();
        if (!step) return;
        const el = document.querySelector(`[data-step-id="${step.id}"]`);
        if (!el) return;

        const effective = resolveStep(step);
        let value;

        if (effective.type === 'radio') {
            const c = el.querySelector('input[type="radio"]:checked');
            if (c) {
                value = c.value;
                if (value === 'Otra:' || value === 'Otro' || value === 'Otro país') {
                    const lbl = c.closest('label');
                    if (lbl) {
                        const ti = lbl.querySelector('.otro-input');
                        if (ti && ti.value.trim() !== '') {
                            value = value + ' ' + ti.value.trim();
                        }
                    }
                }
            } else value = null;
        } else if (effective.type === 'checkbox') {
            const cbs = el.querySelectorAll('input[type="checkbox"]:checked');
            value = Array.from(cbs).map(cb => cb.value);
            const otroInput = el.querySelector('.otro-input');
            if (otroInput && otroInput.value.trim() !== '') {
                const hasOtro = value.includes('Otro') || value.includes('Otra') || value.includes('Otros');
                if (hasOtro) {
                    value = value.filter(v => v !== 'Otro' && v !== 'Otra' && v !== 'Otros');
                    value.push(otroInput.value.trim());
                }
            }
        } else {
            const inp = el.querySelector('input, textarea');
            value = inp ? inp.value : '';
        }
        if (value !== undefined) answers[step.id] = value;
    }

    function loadAnswer(step) {
        const el = document.querySelector(`[data-step-id="${step.id}"]`);
        if (!el) return;
        const val = answers[step.id];
        if (val === undefined) return;

        const effective = resolveStep(step);

        if (effective.type === 'radio') {
            const radios = el.querySelectorAll('input[type="radio"]');
            let found = false;
            radios.forEach(r => {
                if (r.value === val) { r.checked = true; found = true; }
            });
            if (!found && typeof val === 'string') {
                const match = val.match(/^(Otra:|Otro|Otro país)\s+(.+)$/);
                if (match) {
                    const base = match[1];
                    const resto = match[2];
                    radios.forEach(r => {
                        if (r.value === base && !found) {
                            r.checked = true;
                            const lbl = r.closest('label');
                            if (lbl) {
                                const ti = lbl.querySelector('.otro-input');
                                if (ti) ti.value = resto;
                            }
                            found = true;
                        }
                    });
                }
            }
        } else if (effective.type === 'checkbox') {
            const cbs = el.querySelectorAll('input[type="checkbox"]');
            cbs.forEach(cb => {
                if (Array.isArray(val)) cb.checked = val.some(v => v === cb.value || (typeof v === 'string' && v.startsWith(cb.value)));
            });
            const otroInput = el.querySelector('.otro-input');
            if (otroInput && Array.isArray(val)) {
                const otroVal = val.find(v => typeof v === 'string' && !effective.options.some(o => o.value === v));
                if (otroVal) otroInput.value = otroVal;
            }
        } else {
            const inp = el.querySelector('input, textarea');
            if (inp) inp.value = val;
        }
    }

    function registrarTiempoPregunta(stepId) {
        if (preguntaActualId && inicioPregunta) {
            tiemposPorPregunta[preguntaActualId] = Math.round((new Date() - inicioPregunta) / 1000);
        }
        preguntaActualId = stepId;
        inicioPregunta = new Date();
    }

    function renderStep() {
        const step = getCurrentStep();
        const area = document.getElementById('dynamicArea');
        if (!step) { showSummary(); return; }

        const effective = resolveStep(step);

        if (step.id !== preguntaActualId) registrarTiempoPregunta(step.id);

        const visible = getVisibleSteps();
        const idx = getCurrentVisibleIndex();
        document.getElementById('stepCounter').textContent = `Paso ${idx+1} de ${visible.length}`;
        const progress = ((idx) / (visible.length - 1)) * 100;
        document.getElementById('progressFill').style.width = (visible.length === 1 ? 100 : progress) + '%';

        // Color dinámico del progress bar
        document.getElementById('progressFill').style.background = `linear-gradient(90deg, ${encuestaActiva.color}, ${encuestaActiva.color}dd)`;

        let html = `<div class="question-area" data-step-id="${step.id}">`;
        html += `<div class="question-text">${step.question}`;
        if (effective.type === 'text' || effective.type === 'textarea') html += ` <span class="sub-label">(respuesta corta)</span>`;
        if (effective.maxSelections) html += ` <span class="sub-label">(máximo ${effective.maxSelections})</span>`;
        html += `</div>`;

        if (effective.hint) {
            html += `<div class="info-hint">${effective.hint}</div>`;
        }

        const options = effective.options || [];

        if (effective.type === 'radio' || effective.type === 'checkbox') {
            html += `<div class="options-group">`;
            options.forEach(opt => {
                html += `<label>`;
                html += `<input type="${effective.type}" name="${step.id}" value="${opt.value}">`;
                html += `<span>${opt.label}</span>`;
                if ((opt.label === 'Otro' || opt.label === 'Otra' || opt.label === 'Otra:' || opt.label === 'Otro país') && effective.allowOther) {
                    html += `<input type="text" class="otro-input" placeholder="Especifica...">`;
                }
                html += `</label>`;
            });
            html += `</div>`;
        } else if (effective.type === 'text') {
            html += `<input type="text" class="text-input" placeholder="${effective.placeholder || ''}">`;
        } else if (effective.type === 'textarea') {
            html += `<textarea class="text-input textarea" placeholder="${effective.placeholder || ''}"></textarea>`;
        }

        html += `<div class="navigation">`;
        html += `<button class="btn btn-secondary" id="prevBtn" ${idx===0?'disabled':''}>← Anterior</button>`;
        html += (idx === visible.length - 1)
            ? `<button class="btn btn-success" id="nextBtn">Enviar respuestas ✓</button>`
            : `<button class="btn btn-primary" id="nextBtn">Siguiente →</button>`;
        html += `</div></div>`;
        area.innerHTML = html;

        loadAnswer(step);

        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');

        area.querySelectorAll('input, textarea').forEach(inp => {
            inp.addEventListener('change', () => {
                saveCurrentAnswer();
                if (effective.type === 'radio') {
                    const condicionantes = ['p9','p10','p12','p13','p16','p21','p23','p25','p30','p37'];
                    if (condicionantes.includes(step.id)) {
                        const vis = getVisibleSteps();
                        const ni = vis.findIndex(s => s.id === step.id);
                        if (ni !== -1) currentStepIndex = ni;
                        renderStep();
                    }
                }
            });
            inp.addEventListener('blur', saveCurrentAnswer);
        });

        nextBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveCurrentAnswer();
            const s = getCurrentStep();
            if (!s) return;
            const eff = resolveStep(s);

            if (eff.type === 'radio' && !answers[s.id]) { alert('Selecciona una opción.'); return; }
            if (eff.type === 'checkbox') {
                const v = answers[s.id];
                if (!v || !Array.isArray(v) || v.length === 0) { alert('Selecciona al menos una opción.'); return; }
                if (eff.maxSelections && v.length > eff.maxSelections) { alert(`Máximo ${eff.maxSelections} opciones.`); return; }
            }
            if ((eff.type === 'text' || eff.type === 'textarea') && (!answers[s.id] || String(answers[s.id]).trim() === '')) {
                alert('Escribe tu respuesta.'); return;
            }

            const vis = getVisibleSteps();
            if (currentStepIndex === vis.length - 1) {
                nextBtn.disabled = true;
                nextBtn.textContent = 'Enviando...';
                registrarTiempoPregunta(s.id);

                (geoData ? Promise.resolve(geoData) : obtenerGeoData().then(g => geoData = g))
                    .then(g => enviarRespuestas(g))
                    .then(showSummary);
                return;
            }
            registrarTiempoPregunta(s.id);
            currentStepIndex++;
            renderStep();
        });

        prevBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentStepIndex > 0) {
                const s = getCurrentStep();
                if (s) registrarTiempoPregunta(s.id);
                currentStepIndex--;
                renderStep();
            }
        });
    }

    // ================================================================
    // RESUMEN
    // ================================================================
    function showSummary(envioResult) {
        const area = document.getElementById('dynamicArea');
        saveCurrentAnswer();
        const allAnswers = { ...answers };
        const visibleSteps = getVisibleSteps();
        const exito = envioResult && envioResult.success;

        let html = `<div class="summary">`;

        if (exito) {
            html += `<div class="alert alert-success" style="text-align:center; font-size:18px;">
                        ✅ ¡Encuesta enviada correctamente! Muchas gracias por tu tiempo.
                        <p style="margin-top:12px; font-size:16px; color:#5b6f82;">Tus respuestas han sido registradas.</p>
                    </div>`;
        } else {
            if (envioResult) {
                html += `<div class="alert alert-error">❌ Error al enviar: ${envioResult.error}.<br>Tus respuestas se guardaron localmente.</div>`;
            } else {
                html += `<div class="alert alert-info">⚠️ Aún no has enviado los datos.</div>`;
            }

            html += `<h3 style="margin-bottom:16px; font-weight:600;">Resumen de tus respuestas</h3>`;
            visibleSteps.forEach(step => {
                const val = allAnswers[step.id];
                if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && val.trim() === '')) return;
                html += `<div class="summary-item"><strong>${step.question}</strong>`;
                if (Array.isArray(val)) {
                    html += `<div class="answer multi">`;
                    val.forEach(v => html += `<span>${v}</span>`);
                    html += `</div>`;
                } else {
                    html += `<div class="answer">${val}</div>`;
                }
                html += `</div>`;
            });

            html += `<div style="margin-top:24px; display:flex; gap:12px;">
                        <button class="btn btn-secondary" id="backBtn">← Volver</button>
                        <button class="btn btn-primary" id="restartBtn" style="flex:1;">🔁 Nueva encuesta</button>
                     </div>`;
        }
        html += `</div>`;
        area.innerHTML = html;

        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('stepCounter').textContent = exito ? '¡Completado!' : 'Resumen';

        if (!exito) {
            const back = document.getElementById('backBtn');
            const restart = document.getElementById('restartBtn');
            if (back) back.addEventListener('click', () => {
                const v = getVisibleSteps();
                if (v.length) { currentStepIndex = v.length - 1; renderStep(); }
            });
            if (restart) restart.addEventListener('click', () => {
                for (const k in answers) delete answers[k];
                datosEnviados = false;
                currentStepIndex = 0;
                try { localStorage.removeItem(encuestaActiva.STORAGE_KEY); } catch (e) {}
                renderStep();
            });
        }
    }

    // ================================================================
    // INICIO
    // ================================================================
    function init() {
        // Leer tipo de encuesta desde URL
        const params = new URLSearchParams(window.location.search);
        const tipoParam = params.get('tipo');

        // Sin tipo → landing page
        if (!tipoParam) {
            showLanding();
            return;
        }

        // Proveedores: slot preparado pero sin contenido aún
        if (tipoParam === 'proveedores') {
            showFutureType();
            return;
        }

        // Tipo no reconocido → error
        if (!ENCUESTAS[tipoParam]) {
            showInvalidType(tipoParam);
            return;
        }

        // Tipo válido → splash → encuesta
        encuestaActiva = ENCUESTAS[tipoParam];

        // Actualizar título
        document.querySelector('.survey-header h1').textContent = encuestaActiva.titulo;

        // Cargar preguntas desde JSON
        fetch(encuestaActiva.questionsUrl)
            .then(r => {
                if (!r.ok) throw new Error('No se pudieron cargar las preguntas');
                return r.json();
            })
            .then(rawQuestions => {
                steps = parseQuestions(rawQuestions);
                showApp();
            })
            .catch(err => {
                console.error('Error cargando preguntas:', err);
                document.getElementById('dynamicArea').innerHTML = `
                    <div class="alert alert-error" style="margin-top:40px; text-align:center;">
                        <p>❌ Error al cargar la encuesta.</p>
                        <p style="font-size:14px;">${err.message}</p>
                    </div>`;
            });
    }

    function showLanding() {
        const splash = document.getElementById('splashScreen');
        if (splash) splash.style.display = 'none';
        document.getElementById('app').style.display = '';
        document.getElementById('stepCounter').textContent = '';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('dynamicArea').innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <img src="images/megaremates.svg" alt="MegaRemates" style="max-width:180px; margin-bottom:24px;">
                <h2 style="font-size:24px; color:#1a2634; margin-bottom:12px;">Bienvenido a MegaRemates</h2>
                <p style="font-size:16px; color:#5b6f82; margin-bottom:32px;">
                    Tu plataforma de confianza para encontrar las mejores oportunidades.
                </p>
                <div style="display:flex; flex-wrap:wrap; gap:12px; justify-content:center; max-width:500px; margin:0 auto;">
                    <a href="?tipo=compradores" class="btn btn-primary" style="text-decoration:none;">Encuesta de compradores</a>
                    <a href="?tipo=vendedores" class="btn btn-secondary" style="text-decoration:none;">Encuesta de vendedores</a>
                </div>
            </div>`;
    }

    function showInvalidType(tipo) {
        const splash = document.getElementById('splashScreen');
        if (splash) splash.style.display = 'none';
        document.getElementById('app').style.display = '';
        document.getElementById('stepCounter').textContent = '';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('dynamicArea').innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <h2 style="font-size:24px; color:#a12b2b; margin-bottom:16px;">❌ Encuesta no disponible</h2>
                <p style="font-size:16px; color:#5b6f82; margin-bottom:24px;">
                    El tipo <strong>${tipo}</strong> no está disponible.
                </p>
                <p style="font-size:14px; color:#8b9aab; margin-bottom:24px;">
                    Tipos disponibles:
                </p>
                <div style="display:flex; flex-wrap:wrap; gap:12px; justify-content:center; max-width:500px; margin:0 auto;">
                    <a href="?tipo=compradores" class="btn btn-primary" style="text-decoration:none;">Encuesta de compradores</a>
                    <a href="?tipo=vendedores" class="btn btn-secondary" style="text-decoration:none;">Encuesta de vendedores</a>
                </div>
            </div>`;
    }

    function showApp() {
        const splash = document.getElementById('splashScreen');
        const app = document.getElementById('app');

        // Splash screen con título dinámico
        if (splash && app) {
            const splashTitle = splash.querySelector('.splash-title');
            if (splashTitle) {
                splashTitle.textContent = `Encuesta de ${encuestaActiva.tipo} — MegaRemates`;
            }
            splash.style.display = 'flex';
            app.style.display = 'none';
            document.getElementById('startSurveyBtn').addEventListener('click', function() {
                splash.style.display = 'none';
                app.style.display = '';
                startSurvey();
            });
            return;
        }

        startSurvey();
    }

    function showLanding() {
        const splash = document.getElementById('splashScreen');
        if (splash) splash.style.display = 'none';
        document.getElementById('app').style.display = '';
        document.getElementById('stepCounter').textContent = '';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('dynamicArea').innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <img src="images/megaremates.svg" alt="MegaRemates" style="max-width:180px; margin-bottom:24px;">
                <h2 style="font-size:24px; color:#1a2634; margin-bottom:12px;">Bienvenido a MegaRemates</h2>
                <p style="font-size:16px; color:#5b6f82; margin-bottom:32px;">
                    Tu plataforma de confianza para encontrar las mejores oportunidades.
                </p>
                <div style="display:flex; flex-wrap:wrap; gap:12px; justify-content:center; max-width:500px; margin:0 auto;">
                    <a href="?tipo=compradores" class="btn btn-primary" style="text-decoration:none;">Encuesta de compradores</a>
                    <a href="?tipo=vendedores" class="btn btn-secondary" style="text-decoration:none;">Encuesta de vendedores</a>
                </div>
            </div>`;
    }

    function showInvalidType(tipo) {
        const splash = document.getElementById('splashScreen');
        if (splash) splash.style.display = 'none';
        document.getElementById('app').style.display = '';
        document.getElementById('stepCounter').textContent = '';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('dynamicArea').innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <h2 style="font-size:24px; color:#a12b2b; margin-bottom:16px;">❌ Encuesta no disponible</h2>
                <p style="font-size:16px; color:#5b6f82; margin-bottom:24px;">
                    El tipo <strong>${tipo}</strong> no está disponible.
                </p>
                <p style="font-size:14px; color:#8b9aab; margin-bottom:24px;">
                    Tipos disponibles:
                </p>
                <div style="display:flex; flex-wrap:wrap; gap:12px; justify-content:center; max-width:500px; margin:0 auto;">
                    <a href="?tipo=compradores" class="btn btn-primary" style="text-decoration:none;">Encuesta de compradores</a>
                    <a href="?tipo=vendedores" class="btn btn-secondary" style="text-decoration:none;">Encuesta de vendedores</a>
                </div>
            </div>`;
    }

    function showFutureType() {
        const splash = document.getElementById('splashScreen');
        if (splash) splash.style.display = 'none';
        document.getElementById('app').style.display = '';
        document.getElementById('stepCounter').textContent = '';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('dynamicArea').innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <h2 style="font-size:24px; color:#1a2634; margin-bottom:16px;">🚧 Encuesta en preparación</h2>
                <p style="font-size:16px; color:#5b6f82; margin-bottom:24px;">
                    La encuesta de <strong>proveedores</strong> estará disponible próximamente.
                </p>
                <p style="font-size:14px; color:#8b9aab; margin-bottom:24px;">
                    Mientras tanto, puedes participar en:
                </p>
                <div style="display:flex; flex-wrap:wrap; gap:12px; justify-content:center; max-width:500px; margin:0 auto;">
                    <a href="?tipo=compradores" class="btn btn-primary" style="text-decoration:none;">Encuesta de compradores</a>
                    <a href="?tipo=vendedores" class="btn btn-secondary" style="text-decoration:none;">Encuesta de vendedores</a>
                </div>
            </div>`;
    }

    function startSurvey() {
        // Check si ya enviada (antes de cualquier otra acción)
        try {
            if (localStorage.getItem(encuestaActiva.STORAGE_KEY) === 'true') {
                const area = document.getElementById('dynamicArea');
                area.innerHTML = `
                    <div class="alert alert-info" style="margin-top:40px; text-align:center; font-size:18px;">
                        <p>✅ Ya has completado esta encuesta anteriormente.</p>
                        <p style="margin-top:12px; font-size:16px; color:#5b6f82;">Gracias por tu participación.</p>
                    </div>`;
                document.getElementById('stepCounter').textContent = 'Completado';
                document.getElementById('progressFill').style.width = '100%';
                return;
            }
        } catch (e) {}

        fuente = obtenerFuente();
        dispositivo = detectarDispositivo();
        conexion = obtenerConexion();

        obtenerGeoData().then(g => geoData = g).catch(() => geoData = null);

        preguntaActualId = null;
        inicioPregunta = new Date();
        currentStepIndex = 0;
        datosEnviados = false;
        renderStep();
    }

    window.addEventListener('load', init);
})();
