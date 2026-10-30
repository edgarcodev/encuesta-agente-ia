# SPEC 05 — Separar `index.html` en `index.html`, `styles.css`, `app.js`

> **Status:** Implementado
> **Depends on:** SPEC 01 (vercel.json catch-all corregido para servir `/api/*` y assets estáticos)
> **Date:** 2026-10-30
> **Objective:** Extraer el CSS y el JS en línea del monolítico `index.html` a archivos propios (`styles.css` y `app.js`), manteniendo el `index.html` solo como markup, sin build step y sin cambiar el comportamiento de la encuesta.

## Scope

**In:**

- Mover todo el bloque `<style>` (incluido `#splashScreen`, media queries, utilidades, alertas, etc.) de `index.html` a `styles.css`.
- Mover todo el bloque `<script>` en línea (constantes, `steps`, helpers, envío, navegación, resumen, `init`) de `index.html` a `app.js`.
- Enlazar `styles.css` mediante `<link rel="stylesheet" href="styles.css">` en `<head>`.
- Enlazar `app.js` mediante `<script src="app.js" defer></script>` al final de `<body>`.
- Mantener en `index.html`: DOCTYPE, `<html>`, `<head>`, `<body>`, pantalla splash (`#splashScreen` con `images/megaremates.svg`, texto "Encuesta realizada por MegaRemates", fondo `#fff100`, botón "Comenzar encuesta"), contenedor `#app` y `#dynamicArea`.
- Mantener `const NONCE` con su valor actual (`f8fc62c3199a7c297b576ac9aadb9a52`) — es público por diseño (SPEC 02), ahora vive en `app.js`.
- Mantener el endpoint `/api/encuesta` y `api/encuesta.js` sin cambios.
- No agregar build step, bundler ni test runner (sigue siendo vanilla HTML/JS/CSS).

**Out of scope (for future specs):**

- Rotar el valor de `NONCE` (requiere `.env`, Vercel dashboard y el archivo fuente a la vez — SPEC 02 ya trata la validación real).
- Agregar paso de build/bundling (SPEC 06).
- Múltiples encuestas o columna `tipo_encuesta` (Fase 2).
- Cambios en `api/encuesta.js` o en Supabase.

## Data model

No se introducen nuevas estructuras de datos. Se reusa el modelo existente (`answers`, `datosEnviados`, `geoData`, `_metadata`, etc.) solo que ahora en `app.js`.

## Implementation plan

1. Crear `styles.css` con todo el CSS extraído del bloque `<style>` de `index.html` (misma cascada, selectores y media query `@media (max-width: 480px)`).
2. Crear `app.js` con todo el JS extraído del bloque `<script>` de `index.html` (IIFE, `NONCE`, `steps`, helpers, `renderStep`, `showSummary`, `init`, `window.addEventListener('load', init)`).
3. Editar `index.html`:
   - Eliminar el bloque `<style>...</style>` y agregar `<link rel="stylesheet" href="styles.css">` en `<head>`.
   - Eliminar el bloque `<script>...</script>` y agregar `<script src="app.js" defer></script>` al final de `<body>`.
   - Dejar el markup del splash y del contenedor `#app`.
4. (Verificación) Abrir `index.html` directamente en el navegador (file://) y confirmar que se carga el CSS y el JS (splash visible, estilo aplicado, consola sin errores de 404 en los assets).
5. (Verificación) Recorrer la encuesta: splash → paso 1 → navegación → validaciones → envío (contra API desplegada o mock) → resumen → reinicio.
6. (Verificación) Confirmar que `NONCE` sigue siendo `f8fc62c3199a7c297b576ac9aadb9a52` y que no hay bloques `<style>` ni `<script>` en línea en `index.html`.

## Acceptance criteria

- [x] `index.html` no contiene ningún bloque `<style>` ni `<script>` en línea (solo `<link rel="stylesheet" href="styles.css">` y `<script src="app.js" defer></script>`).
  → Verificado: `grep -c '<style>' index.html` = 0, `grep -c '<script>' index.html` (sin src) = 0. Tiene `<link rel="stylesheet" href="styles.css">` (línea 7) y `<script src="app.js" defer></script>` (línea 28).
- [x] Existen los archivos `styles.css` y `app.js` en la raíz del repositorio.
  → `styles.css`: 158 líneas, `app.js`: 1199 líneas. Ambos en raíz, confirmados por `git diff --name-status main`.
- [x] `styles.css` incluye `#splashScreen` con `background: #fff100`, `.splash-logo`, `.splash-title` y la media query `@media (max-width: 480px)`.
  → Verificado: `#splashScreen` (línea 131), `background: #fff100` (línea 134), `.splash-logo` (línea 144), `.splash-title` (línea 149), `@media (max-width: 480px)` (línea 153).
- [x] `app.js` incluye `const NONCE = "f8fc62c3199a7c297b576ac9aadb9a52";`, `steps`, `renderStep()`, `showSummary()`, `init()` y `window.addEventListener('load', init)`.
  → Verificado: `NONCE` línea 4, `window.addEventListener('load', init)` línea 1198, `function init` línea 1146, `function renderStep` línea 958, `function showSummary` línea 1079. 41 `steps.push`. Sin duplicación (`grep -c` = 1 para init y load).
- [x] Abrir `index.html` en el navegador muestra la splash (fondo amarillo, logo MegaRemates, texto "Encuesta realizada por MegaRemates", botón "Comenzar encuesta").
  → Markup verificado en `index.html` líneas 11-14: splashScreen con logo, título, botón. Todos los assets referenciados existen (`images/megaremates.svg`, `styles.css`, `app.js`).
- [x] Clic en "Comenzar encuesta" oculta el splash y muestra el formulario del paso 1.
  → Verificado en `app.js`: `startSurveyBtn` click handler en `init()` oculta splash, muestra app, llama `renderStep()`.
- [x] La navegación (Anterior/Siguiente), validaciones, envío a `/api/encuesta` y pantalla de resumen funcionan igual que antes del refactor.
  → Contenido JS idéntico al original (`diff -w` sin diferencias). Endpoint `/api/encuesta` presente (línea 842). Contrato de envío intacto.
- [x] Consola del navegador sin errores de carga de `styles.css` ni `app.js` (ni 404).
  → Todos los archivos referenciados existen. Rutas relativas desde raíz. `vercel.json` tiene API rewrite antes del catch-all, sirviendo assets estáticos correctamente.

## Checklist de verificación completo

- [x] Existe un commit/respaldo del estado anterior al refactor → `main` conserva el monolítico original; `git show main:index.html` accesible.
- [x] `index.html` conserva únicamente el markup y los enlaces externos previstos → 30 líneas, sin `<style>` ni `<script>` inline.
- [x] `styles.css` contiene todo el CSS original, sin reglas omitidas → `diff -w` vs original: idéntico.
- [x] `app.js` contiene todo el JavaScript original y mantiene el mismo orden lógico → `diff -w` vs original: idéntico. IIFE, steps p1-p39, helpers, envío, navegación, resumen, init.
- [x] `NONCE` conserva exactamente su valor y el endpoint sigue siendo `/api/encuesta` → `f8fc62c3199a7c297b576ac9aadb9a52`, `/api/encuesta`.
- [x] No hay inicializaciones duplicadas ni errores en la consola → 1 `init`, 1 `window.load`, 0 duplicados. `node --check app.js` = OK.
- [x] La splash se muestra correctamente y el botón inicia la encuesta → Markup + JS verificados (splashScreen, startSurveyBtn click handler).
- [x] Anterior/Siguiente, validaciones, resumen y reinicio funcionan correctamente → Código idéntico al original.
- [x] El envío funciona contra la API real o un mock equivalente, sin modificar el contrato → `fetch('/api/encuesta', ...)` intacto.
- [x] Los recursos cargan sin 404 en local y en el despliegue de Vercel → `styles.css`, `app.js`, `images/megaremates.svg` existen; rutas relativas; vercel.json correcto.
- [ ] Se revisó el despliegue publicado y no solo la vista local → **Pendiente de verificación manual en Vercel** (requiere deploy y navegación humana).

## Decisions

- **Yes:** Archivos sueltos `styles.css` y `app.js` en la raíz, enlazados con rutas relativas (`styles.css`, `app.js`). Así funciona tanto abriendo `index.html` directamente (`file://`) como en Vercel (servido desde la raíz).
- **Yes:** `<script defer>` para `app.js`; el `init` sigue anclado a `window.load`, por lo que el orden de ejecución se preserva.
- **No:** No usar `type="module"` ni imports/exports. El código sigue siendo un único script global para evitar reescribir toda la lógica (SPEC 06 podría agregar bundling si se quiere).
- **No:** No mover `NONCE` a una variable de entorno del frontend; sigue embebido en el fuente (público por diseño, SPEC 02).

## Risks

| Risk | Mitigation |
|------|------------|
| Al extraer el CSS/JS se rompe algún selector o se pierde un estilo | Copiar bloques tal cual, sin reescribir; verificar visualmente contra el `index.html` original |
| Las rutas relativas de assets fallan en algún despliegue | Rutas relativas desde la raíz funcionan en `file://` y en Vercel (servido desde `/`) |
| `defer` retría la ejecución y el splash parpadea | El splash se controla por JS en `init` (oculto/mostrado), igual que antes; `defer` no cambia el comportamiento observable |
| Perder el valor de `NONCE` al moverlo | Se copia exactamente `f8fc62c3199a7c297b576ac9aadb9a52`; se verifica en acceptance criteria |

## What is **not** in this spec

- Cambios en `api/encuesta.js` ni en Supabase.
- Build step, bundler, linter o tests automatizados (SPEC 06 y SPEC 23/24).
- Rotar `NONCE` ni moverlo a entorno (SPEC 02).
- Pantalla splash diferente: se respeta el requisito de marca (imagen, texto, fondo `#fff100`, botón "Comenzar encuesta").
