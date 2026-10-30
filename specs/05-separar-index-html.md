# SPEC 05 — Separar `index.html` en `index.html`, `styles.css`, `app.js`

> **Status:** Aprobado
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

- [ ] `index.html` no contiene ningún bloque `<style>` ni `<script>` en línea (solo `<link rel="stylesheet" href="styles.css">` y `<script src="app.js" defer></script>`).
- [ ] Existen los archivos `styles.css` y `app.js` en la raíz del repositorio.
- [ ] `styles.css` incluye `#splashScreen` con `background: #fff100`, `.splash-logo`, `.splash-title` y la media query `@media (max-width: 480px)`.
- [ ] `app.js` incluye `const NONCE = "f8fc62c3199a7c297b576ac9aadb9a52";`, `steps`, `renderStep()`, `showSummary()`, `init()` y `window.addEventListener('load', init)`.
- [ ] Abrir `index.html` en el navegador muestra la splash (fondo amarillo, logo MegaRemates, texto "Encuesta realizada por MegaRemates", botón "Comenzar encuesta").
- [ ] Clic en "Comenzar encuesta" oculta el splash y muestra el formulario del paso 1.
- [ ] La navegación (Anterior/Siguiente), validaciones, envío a `/api/encuesta` y pantalla de resumen funcionan igual que antes del refactor.
- [ ] Consola del navegador sin errores de carga de `styles.css` ni `app.js` (ni 404).

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
