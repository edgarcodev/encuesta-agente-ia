# SPEC 06 — Agregar paso de build/bundling ligero con esbuild

> **Status:** Implementado
> **Depends on:** SPEC 05 (separación de `index.html` en `index.html`, `styles.css`, `app.js`)
> **Date:** 2026-10-30
> **Objective:** Agregar un paso de build con `esbuild` que concatene y minifique `styles.css` y `app.js` en una carpeta `dist/`, ejecutable localmente con `npm run build` y automáticamente en Vercel con el hook `vercel-build`.

## Scope

**In:**

- Crear `package.json` con `"name": "encuesta-agente-ia"`, `"type": "module"`, y `esbuild` como única `devDependency`.
- Crear `build.mjs` (ESM script de Node) que use la API JS de `esbuild` para:
  - Concatenar y minificar `styles.css` → `dist/styles.css`.
  - Bundlear y minificar `app.js` → `dist/app.js` (formato IIFE, global, sin imports/exports).
  - Copiar `index.html` a `dist/index.html` y reescribir las rutas de los assets para que apunten a los archivos de `dist/` (que quedan en la misma carpeta en el output, así las rutas relativas funcionan).
  - Copiar `images/` a `dist/images/`.
- Agregar scripts en `package.json`:
  - `"build": "node build.mjs"` — corre el build local.
  - `"vercel-build": "npm run build"` — hook para que Vercel ejecute el build antes de servir `dist/`.
- Modificar `vercel.json` para que la raíz del sitio apunte a `dist/` en producción (`"outputDirectory": "dist"`), o bien usar rewrites para servir desde `dist/`.
- Agregar `dist/` y `node_modules/` al `.gitignore`.
- Agregar `.npmrc` con `engine-strict=false` para evitar problemas de versión de Node en Vercel.
- Actualizar `AGENTS.md` con la nueva estructura, el comando `npm run build`, y la mención de `dist/` como carpeta de salida del build.

**Out of scope (for future specs):**

- Minificación de imágenes SVG (`images/megaremates.svg` se copia tal cual).
- Sourcemaps para desarrollo local (no se incluyen en producción).
- Linting, formateo o tests automatizados (SPEC 23/24).
- Splitting por código o lazy loading (la encuesta es un solo archivo JS pequeño).
- Cambios en `api/encuesta.js` ni en Supabase.

## Data model

No se introducen nuevas estructuras de datos de aplicación. El build produce:

- `dist/index.html` — copia del `index.html` raíz con rutas ajustadas (si es necesario; si las rutas relativas apuntan a `styles.css` y `app.js` en el mismo nivel, no hace falta modificarlas).
- `dist/styles.css` — CSS concatenado y minificado.
- `dist/app.js` — JS bundled (IIFE) y minificado.
- `dist/images/megaremates.svg` — copia del logo.

## Implementation plan

1. **Crear `package.json`** con `{ "name": "encuesta-agente-ia", "private": true, "type": "module", "scripts": { "build": "node build.mjs", "vercel-build": "npm run build" }, "devDependencies": { "esbuild": "^0.25.0" } }`.
2. **Crear `build.mjs`** con la lógica de esbuild:
   - `esbuild.build({ entryPoints: ['app.js'], bundle: true, format: 'iife', minify: true, outfile: 'dist/app.js' })`.
   - `esbuild.build({ entryPoints: ['styles.css'], bundle: true, minify: true, outfile: 'dist/styles.css' })`.
   - Copiar `index.html` a `dist/index.html` (con Node `fs`). Si las rutas en `index.html` ya son relativas (`styles.css`, `app.js`), y en `dist/` quedan al mismo nivel, no se necesita modificar el HTML.
   - Copiar `images/` a `dist/images/` (recursivo).
   - Limpiar `dist/` antes de cada build (borrar y recrear).
3. **Agregar `dist/` y `node_modules/` al `.gitignore`** (si no están ya).
4. **Instalar dependencias**: `npm install` (genera `package-lock.json`). Agregar `package-lock.json` al repo.
5. **Correr `npm run build`** localmente y verificar:
   - Existen `dist/index.html`, `dist/styles.css`, `dist/app.js`, `dist/images/megaremates.svg`.
   - `dist/styles.css` y `dist/app.js` están minificados (una sola línea, sin espacios superfluos).
   - Abrir `dist/index.html` en el navegador: splash visible, estilos aplicados, encuesta funcional (contra API mock o desplegada).
6. **Configurar `vercel.json`** para producción: agregar `"outputDirectory": "dist"` si Vercel lo soporta, o ajustar rewrites para que sirva desde `dist/`. Alternativa: en `vercel.json`, el catch-all rewrite apunta a `/dist/index.html` y los assets estáticos se sirven desde `/dist/`.
7. **Actualizar `AGENTS.md`**:
   - Agregar sección "Build" con el comando `npm run build` y la descripción de `dist/`.
   - Actualizar el bullet de "Stack" para mencionar que ahora existe un build step (esbuild).
   - Agregar `package.json` y `build.mjs` a la lista de archivos del proyecto.

## Acceptance criteria

- [ ] Existe `package.json` con `esbuild` como `devDependency` y scripts `build` y `vercel-build`.
- [ ] Existe `build.mjs` que usa la API JS de esbuild (no CLI shell).
- [ ] `npm run build` genera `dist/index.html`, `dist/styles.css`, `dist/app.js`, `dist/images/megaremates.svg`.
- [ ] `dist/styles.css` y `dist/app.js` están minificados (contenido en una línea, sin espacios innecesarios).
- [ ] `dist/index.html` es funcional: al abrirlo en el navegador muestra la splash, aplica estilos, y la encuesta funciona.
- [ ] `dist/` y `node_modules/` están en `.gitignore`.
- [ ] `vercel.json` está configurado para servir desde `dist/` en producción.
- [ ] `AGENTS.md` documenta el nuevo build step, los archivos `package.json` y `build.mjs`, y la carpeta `dist/`.
- [ ] `npm run build` es idempotente: correrlo dos veces seguidas produce el mismo resultado sin errores.
- [ ] `package-lock.json` está versionado en git.

## Decisions

- **Yes:** `esbuild` sobre Vite/Parcel/webpack. El proyecto es pequeño (un HTML, un CSS, un JS) y no necesita dev server, HMR, ni code splitting. esbuild es el más rápido y con menos configuración.
- **Yes:** Script `build.mjs` con la API JS de esbuild en lugar de CLI shell. Más legible, más fácil de extender, sin depender de shell commands (`rm -rf`, `cp -r`) que varían entre Linux/Windows/macOS.
- **Yes:** `dist/` como carpeta de salida separada. Mantiene los archivos fuente limpios y permite comparar fácilmente antes/después del build.
- **Yes:** `package.json` con `esbuild` como devDependency. El proyecto ahora tiene un build step, así que npm es la forma natural de gestionar la dependencia y los scripts.
- **No:** Sourcemaps en producción. Son innecesarios para un archivo JS pequeño y exponen el código fuente no minificado.
- **No:** Transpilación (Babel/SWC). El target del build es navegadores modernos (la encuesta es vanilla JS sin sintaxis experimental); esbuild minifica sin transpilar.
- **Yes:** `package-lock.json` versionado. Garantiza builds reproducibles en local y en Vercel.
- **No:** Minificar `index.html`. El HTML es pequeño y minificarlo complica los rewrites de Vercel y la depuración manual; el beneficio es insignificante.

## Risks

| Risk | Mitigation |
|------|------------|
| esbuild no encuentra el binario en Vercel | `npm install` corre automáticamente en Vercel; el binario de esbuild se descarga en `postinstall`. Si falla, usar `esbuild-wasm` como fallback |
| Las rutas relativas en `dist/index.html` no apuntan bien a los assets | En `dist/`, `styles.css`, `app.js` e `images/` quedan al mismo nivel que `index.html`, igual que en la raíz; las rutas relativas no cambian |
| `vercel.json` no soporta `outputDirectory` o el rewrite no funciona | Si `outputDirectory` no funciona, usar rewrites explícitos: `"/(.*)"` → `"/dist/$1"` y `"/"` → `"/dist/index.html"` |
| Dependencia nueva rompe el CI de Vercel | Probar con `vercel deploy` en preview antes de mergear a producción |

## What is **not** in this spec

- Cambios en `api/encuesta.js` ni en Supabase.
- Linting, formateo o tests (SPEC 23/24).
- Minificación de imágenes SVG.
- Sourcemaps ni transpilación Babel.
- Modificaciones en el flujo de la encuesta (splash, pasos, envío).
