# SPEC 23 — Pruebas unitarias y E2E para flujo de envío y pasos condicionales

> **Status:** Draft
> **Depends on:** SPEC 02, SPEC 03, SPEC 09, SPEC 10, SPEC 19
> **Date:** 2026-11-02
> **Objective:** Agregar pruebas unitarias (Vitest) para el motor de condiciones, definiciones dinámicas, envío y API, más pruebas E2E (Playwright) que automatizan el flujo completo de encuesta incluyendo pasos condicionales, validaciones y consentimiento de privacidad, con ejecución en local y CI/CD.

## Contexto

El proyecto tiene 22 specs implementados pero cero pruebas automatizadas. La verificación es manual: abrir el navegador, llenar preguntas, revisar la BD. Esto es frágil y no escala. Este spec establece la infraestructura de testing (Vitest + Playwright + GitHub Actions) y cubre las funciones críticas del frontend y la API serverless.

## Scope

**In:**

- **Infraestructura de testing**: Vitest (unitarias), Playwright (E2E), scripts en `package.json`, configuración.
- **Pruebas unitarias de lógica pura** (`app.js`): `evaluateCondition()`, `applyDynamicDefinition()`, `parseQuestions()`.
- **Pruebas unitarias de envío** (`app.js`): `enviarRespuestas()` — armado del payload con/sin metadata, manejo de errores.
- **Pruebas unitarias de API** (`api/encuesta.js`): validación de token, rate limiting, inserción correcta, rechazo de payloads inválidos.
- **Pruebas E2E** (Playwright): flujo completo (splash → preguntas → resumen → envío exitoso), pasos condicionales, validación de campos obligatorios, privacidad (checkbox desmarcado).
- **CI/CD**: workflow de GitHub Actions que ejecuta unitarias y E2E en cada push/PR.
- **Refactor mínimo en `app.js`**: extraer funciones puras a módulo importable para que Vitest pueda testearlas sin ejecutar el IIFE completo.

**Out of scope (para futuros specs):**

- Pruebas del dashboard (`dashboard/*.js`) ni del login (`login/auth.js`).
- Pruebas de carga o performance.
- Umbral obligatorio de cobertura de código.
- Pruebas visuales (screenshot diff, Percy, etc.).
- Pruebas de `build.mjs`.

## Data model

No se introducen nuevas estructuras de datos. El spec agrega archivos de prueba que consumen los existentes:

- `config/preguntas/compradores.json` y `config/preguntas/vendedores.json` se usan como fixtures de entrada para las pruebas unitarias y E2E.
- Las pruebas de API mockean la tabla `respuestas_encuesta` y el RPC `increment_rate_limit`.

## Implementation plan

1. **Instalar dependencias y configurar scripts**:
   - `npm install -D vitest @vitest/browser playwright`
   - `npx playwright install` (Chrome + Firefox headless)
   - Agregar scripts a `package.json`:
     - `"test:unit": "vitest run"`
     - `"test:unit:watch": "vitest"`
     - `"test:e2e": "playwright test"`
     - `"test": "npm run test:unit && npm run test:e2e"`
   - Crear `vitest.config.js` (entorno jsdom, alias si necesario).
   - Crear `playwright.config.js` (servir `dist/` con web server, navegadores chromium).

2. **Extraer funciones puras de `app.js` a módulo testable**:
   - Crear `lib/conditions.js` con: `evaluateCondition()`, `applyDynamicDefinition()`, `parseQuestions()`.
   - Cada función se exporta (`export function ...`).
   - Actualizar `app.js` para importar desde `lib/conditions.js` en lugar de definir las funciones internamente.
   - **Criterio**: `app.js` se comporta idénticamente; las funciones puras son importables por Vitest.
   - Actualizar `build.mjs` para incluir `lib/conditions.js` en el bundle (ya lo hace si copia todo el `app.js` que importa el módulo).

3. **Pruebas unitarias — motor de condiciones** (`tests/unit/conditions.test.js`):
   - `evaluateCondition()`:
     - `{ always: true }` → `true`
     - `equals`, `notEquals`, `oneOf`, `includes`, `notIncludes` — casos positivos y negativos.
     - Operadores `logic: 'and'` (todas verdaderas → true, una falsa → false).
     - Operadores `logic: 'or'` (una verdadera → true, todas falsas → false).
   - `applyDynamicDefinition()`:
     - Sin dynamicDefinition → retorna igual.
     - Con dd, condiciones coinciden → aplica `then`.
     - Con dd, condiciones no coinciden → aplica `else`.
     - dd con `logic: 'and'` múltiple.
   - `parseQuestions()`:
     - Convierte strings de options a objetos `{ label, value }`.
     - Wraps `condition()` y `getDefinition()` en las preguntas resultantes.
     - Questions JSON de compradores y vendedores parsean sin error.

4. **Pruebas unitarias — envío de respuestas** (`tests/unit/enviar.test.js`):
   - Mock de `fetch` global.
   - `enviarRespuestas()` con `allowMetadata = true`:
     - Payload incluye `_metadata` completo (fuente, dispositivo, tiempos, navegador) y `_geo`.
     - `tipo_encuesta` se envía correctamente.
   - `enviarRespuestas()` con `allowMetadata = false`:
     - Payload solo incluye `_metadata.tiempo_total_segundos`.
     - No incluye `_geo` ni datos de navegador.
   - Respuesta de API con error (429, 500): retorna `{ success: false, error: ... }`.
   - Respuesta de API exitosa: retorna `{ success: true, data }` y marca `datosEnviados = true`.
   - localStorage se escribe en caso de éxito.

5. **Pruebas unitarias — API serverless** (`tests/unit/api.test.js`):
   - Importar el handler de `api/encuesta.js` (refactor mínimo para exportar).
   - Mock de Supabase client y `increment_rate_limit` RPC.
   - Token válido + payload correcto → 200, inserción en BD.
   - Token inválido → 401/403, nada se inserta.
   - Token ausente → error.
   - Rate limit excedido (count > 5) → 429 con header `Retry-After`.
   - Payload sin `datos` → 400.
   - `tipo_encuesta` inválido (no en CHECK) → error manejado.
   - IP se extrae correctamente de `x-real-ip` → `x-forwarded-for` → `'unknown'`.

6. **Pruebas E2E con Playwright** (`tests/e2e/survey.spec.js`):
   - Configurar web server que sirva `dist/` (o `index.html` + archivos estáticos + mock de API).
   - **Flujo completo de compradores**:
     - Navegar a `/?tipo=compradores`.
     - Splash visible → clic "Comenzar encuesta".
     - Responder todas las preguntas visibles (radio, checkbox, text).
     - Llegar al resumen → revisar respuestas.
     - Marcar checkbox de privacidad → confirmar envío.
     - Verificar mensaje de éxito.
   - **Flujo completo de vendedores**:
     - Igual que compradores pero con `/?tipo=vendedores`.
   - **Pasos condicionales**:
     - Responder p9 con valor que activa condición → nueva pregunta aparece.
     - Cambiar p9 a valor que desactiva → pregunta desaparece.
     - Verificar que el contador de pasos refleja los visibles.
   - **Validación de campos obligatorios**:
     - Intentar avanzar sin responder radio → alert o mensaje.
     - Intentar avanzar sin responder checkbox → alert o mensaje.
     - Texto vacío → no avanza.
   - **Privacidad sin consentimiento**:
     - Completar encuesta → desmarcar checkbox de privacidad → enviar.
     - Verificar que el payload no incluye `_geo` ni `_metadata` detallado (interceptar request con Playwright).
   - **Tipo inválido**:
     - Navegar a `/?tipo=noexiste` → mensaje de error con enlaces a encuestas válidas.
   - **Ya enviada**:
     - Enviar encuesta → recargar página → mensaje "Ya has completado esta encuesta".
     - Usar `localStorage` del contexto de Playwright.

7. **Mock de API para E2E**:
   - Las pruebas E2E interceptan el POST a `/api/encuesta` con Playwright's `page.route()`.
   - Responden 200 con `{ success: true }` para no depender de Supabase real en E2E.
   - Para pruebas de error, responden 429 o 500 según el caso.
   - Esto hace que las E2E sean rápidas, deterministas y no requieran credenciales de BD.

8. **CI/CD — GitHub Actions** (`.github/workflows/test.yml`):
   - Trigger: `push` a `main`, `pull_request` a `main`.
   - Jobs:
     - `unit-tests`: Node.js, `npm ci`, `npm run build`, `npm run test:unit`.
     - `e2e-tests`: Node.js, `npm ci`, `npm run build`, `npx playwright install --with-deps`, `npm run test:e2e`.
   - Upload de resultados y artifacts (screenshots de fallos E2E).

## Acceptance criteria

- [ ] `npm run test:unit` ejecuta sin errores y todas las pruebas pasan.
- [ ] `evaluateCondition()` tiene pruebas para todos los operadores (equals, notEquals, oneOf, includes, notIncludes) y lógica (and, or).
- [ ] `applyDynamicDefinition()` tiene pruebas para los casos: sin dd, con dd match then, con dd match else, dd con lógica and múltiple.
- [ ] `parseQuestions()` convierte opciones string a objetos y wrapps condition/getDefinition.
- [ ] `enviarRespuestas()` con allowMetadata=true envía _metadata completo y _geo.
- [ ] `enviarRespuestas()` con allowMetadata=false envía solo tiempo_total_segundos, sin _geo.
- [ ] `enviarRespuestas()` maneja errores de red (retorna success: false con mensaje).
- [ ] `api/encuesta.js` acepta token válido y rechaza inválido (unit test).
- [ ] `api/encuesta.js` retorna 429 cuando rate limit excedido (unit test).
- [ ] E2E: flujo completo de compradores pasa (splash → preguntas → resumen → éxito).
- [ ] E2E: flujo completo de vendedores pasa.
- [ ] E2E: pasos condicionales aparecen/desaparecen según respuestas.
- [ ] E2E: validación impide avanzar sin responder campos obligatorios.
- [ ] E2E: privacidad desmarcada no envía _geo ni _metadata detallado (verificado interceptando request).
- [ ] E2E: tipo inválido muestra error con enlaces válidos.
- [ ] E2E: segunda visita muestra "Ya has completado esta encuesta".
- [ ] `npm run test:e2e` ejecuta sin errores.
- [ ] GitHub Actions workflow se ejecuta en push/PR y ambas jobs pasan.
- [ ] `app.js` mantiene comportamiento idéntico después de la extracción de funciones puras.

## Decisions

- **Yes:** Vitest para unitarias — moderno, rápido, compatible con ES modules, buena integración con jsdom.
- **Yes:** Playwright para E2E — multi-navegador, API limpia, interceptación de requests nativa.
- **Yes:** CI/CD con GitHub Actions — ambos jobs (unit + E2E) en push y PR.
- **Yes:** Mock de API en E2E con `page.route()` — pruebas deterministas, sin dependencia de Supabase real.
- **Yes:** Extraer funciones puras a `lib/conditions.js` — necesario para que Vitest las importe sin ejecutar el IIFE del DOM.
- **Yes:** Sin umbral de cobertura — el objetivo es cubrir lo crítico, no perseguir un porcentaje.
- **No:** Refactor completo de `app.js` a módulos — solo se extrae lo puro; el resto sigue en IIFE (menor riesgo).
- **No:** Dashboard/login en este spec — se enfoca en el flujo de encuesta que es el core del producto.

## Risks

| Risk | Mitigation |
|------|------------|
| `app.js` cambia comportamiento al extraer funciones | Verificar manualmente el flujo completo antes y después; las E2E lo capturarán |
| E2E frágiles (dependen de timing del DOM) | Usar `waitForSelector`, `waitForLoadState` en lugar de `setTimeout` |
| Mock de API en E2E no refleja comportamiento real | Las unitarias de `api/encuesta.js` cubren la lógica real; E2E solo validan el flujo del frontend |
| Playwright consume muchos recursos en CI | Usar solo Chromium en CI (multi-navegador solo local si se desea) |
| `lib/conditions.js` queda desincronizado con `app.js` | Las pruebas E2E ejecutan sobre el bundle completo y detectan discrepancias |

## What is **not** in this spec

- Pruebas del dashboard (`dashboard/*.js`) ni del login (`login/auth.js`).
- Pruebas de carga, stress o performance.
- Umbral mínimo de cobertura de código (80%, 90%, etc.).
- Pruebas visuales o de regresión de UI.
- Pruebas de `build.mjs` o del proceso de bundling.
- Refactor completo de `app.js` a arquitectura de módulos — solo extracción de funciones puras.
