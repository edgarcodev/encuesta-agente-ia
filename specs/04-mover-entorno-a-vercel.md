# SPEC 04 — Mover variables de entorno al dashboard de Vercel (no depender de `.env` local)

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02, SPEC 03
> **Date:** 2026-10-29
> **Objective:** Que `api/encuesta.js` lea `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` y `SECRET_NONCE` exclusivamente del entorno de ejecución de Vercel (dashboard → Settings → Environment Variables), sin requerir `.env` local en producción, manteniendo `.env` solo como conveniencia para desarrollo local con `vercel dev`.

## Scope

**In:**

- Verificar que las 3 variables (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SECRET_NONCE`) existen en el dashboard de Vercel (producción) con valores no vacíos y coincidentes con `.env` local.
- Reescribir `.env.example` como plantilla dotenv estándar (`CLAVE=valor`) con placeholders y un comentario de que en producción las variables se configuran en el dashboard de Vercel, no desde este archivo.
- Verificar que `api/encuesta.js` lea las 3 variables de `process.env` (ya lo hace tras SPEC 02/SPEC 03; no se requiere cambio de código, solo confirmar).
- Verificar que `index.html` mantenga la constante `NONCE` embebida, coincidente con `SECRET_NONCE` de Vercel (público por diseño, per SPEC 02).
- Desplegar en Vercel (o verificar despliegue existente) y hacer smoke test en producción: `POST /api/encuesta` con token correcto → `201`, sin que exista `.env` en el entorno de ejecución de Vercel.
- Mantener `.env` local (gitignorado) como fallback para desarrollo local con `vercel dev`.
- Limpiar datos de prueba generados durante la verificación (filas `verif04_*` en `respuestas_encuesta`).
- Actualizar `AGENTS.md` si es necesario para reflejar que las variables de entorno viven en el dashboard de Vercel.

**Out of scope (for future specs):**

- Crear las variables en Vercel si faltan (se asume que ya existen, per confirmación del usuario; si faltan, es un paso previo fuera de esta spec).
- Rotar `SECRET_NONCE` (ya existe con el mismo valor en `.env` y en Vercel; rotar requiere tocar 3 lugares: `.env`, dashboard de Vercel, `index.html` — eso va en su propia spec si se necesita).
- Cambios en `api/encuesta.js` más allá de confirmar que lee de `process.env`.
- Cambios en `vercel.json` (cerrado en SPEC 01).
- Cambios en `index.html` más allá de confirmar la constante `NONCE`.

## Data model

This feature introduces no new data structures. It reuses the existing model:

- `process.env.SUPABASE_URL`, `process.env.SUPABASE_SERVICE_KEY`, `process.env.SECRET_NONCE` (leídos por `api/encuesta.js`).
- `const NONCE` en `index.html` (valor literal del secreto, público por diseño).

## Implementation plan

1. Confirmar en el dashboard de Vercel (Settings → Environment Variables, producción) que `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` y `SECRET_NONCE` existen con valores no vacíos y coincidentes con `.env` local (sin escribir los secretos en la evidencia).
2. Reescribir `.env.example` como plantilla dotenv estándar con placeholders (`SUPABASE_URL=https://tusubdominio.supabase.co`, etc.) y un comentario final aclarando que en producción las variables se configuran en el dashboard de Vercel.
3. Leer `api/encuesta.js` y confirmar que las 3 variables se obtienen de `process.env` y que el endpoint falla closed (500) si faltan. No se modifica el archivo si ya cumple.
4. Leer `index.html` y confirmar que `const NONCE` está embebida y que su valor coincide con `SECRET_NONCE` de Vercel (verificación conductual: POST con ese token devuelve 201 en producción).
5. Desplegar en Vercel (o verificar que el despliegue actual ya incluye `vercel.json` corregido de SPEC 01) y hacer smoke test en producción: `POST /api/encuesta` con token correcto → `201`; `POST` con token incorrecto → `401`.
6. Limpiar datos de prueba: borrar de `respuestas_encuesta` las filas cuyo `datos` contenga `verif04`. Confirmar que no quedan filas de prueba.
7. (Opcional) Actualizar `AGENTS.md` para reflejar que las variables de entorno viven en el dashboard de Vercel y que `.env` es solo conveniencia local.

## Acceptance criteria

- [ ] `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` y `SECRET_NONCE` existen en el dashboard de Vercel (producción) con valores no vacíos.
- [ ] `.env.example` es una plantilla dotenv estándar (`CLAVE=valor`) con placeholders y comentario sobre el dashboard de Vercel.
- [ ] `api/encuesta.js` lee las 3 variables de `process.env` y responde 500 si faltan (fail closed).
- [ ] `index.html` mantiene `const NONCE` embebida, coincidente con `SECRET_NONCE` de Vercel.
- [ ] `POST /api/encuesta` en producción con token correcto devuelve `201` sin depender de `.env` local.
- [ ] `POST /api/encuesta` en producción con token incorrecto devuelve `401`.
- [ ] `.env` local sigue presente y gitignorado para desarrollo local con `vercel dev`.
- [ ] No quedan datos de prueba en la BD: ninguna fila con `verif04` en `respuestas_encuesta`.

## Decisions taken and discarded

- **Yes:** Mover las 3 variables al dashboard de Vercel. `SUPABASE_SERVICE_KEY` bypassa RLS (admin pleno) y nunca debe vivir en un archivo que pueda filtrarse o copiarse por error.
- **Yes:** Conservar `.env` local como fallback solo para desarrollo (`vercel dev` lo lee). No se elimina porque rompería el desarrollo local hasta hacer `vercel env pull`.
- **No:** Eliminar `.env` por completo. El desarrollo local lo necesita para `vercel dev`; es conveniencia, no fuente de verdad en producción.
- **No:** Rotar `SECRET_NONCE` en esta spec. Ya existe con el mismo valor en `.env` y en Vercel; rotar requiere tocar 3 lugares a la vez (`.env`, dashboard de Vercel, `index.html`).
- **Yes:** Mantener `const NONCE` embebida en `index.html` (público por diseño, per SPEC 02). El cliente necesita enviarlo como `token`.
- **No:** Cambiar `api/encuesta.js` para leer de otro sitio. Ya lee de `process.env`, que en Vercel se resuelve a las variables del dashboard.

## Risks

| Risk | Mitigation |
|------|------------|
| El valor de `SECRET_NONCE` en Vercel no coincide con `const NONCE` en `index.html` → todos los envíos legítimos reciben 401 | Verificación conductual en producción (paso 4) antes de marcar Implementado; rotar siempre en los 3 lugares a la vez si se rotara |
| Alguien sube `.env` por error al repo → exposición de `SUPABASE_SERVICE_KEY` | `.env` está en `.gitignore`; revisar antes de commitear |
| Desarrollo local roto si falta `.env` y no se traen las variables con `vercel env pull` | Documentar en `AGENTS.md` que `.env` es conveniencia local y cómo poblarlo desde el dashboard |
| Las variables no existen realmente en Vercel (asunción del usuario) | Paso 1 las confirma; si faltan, se crean antes de continuar (fuera de esta spec) |

## What is **not** in this spec

- Crear variables en el dashboard de Vercel si faltan (se da por hecho que existen; paso 1 solo verifica).
- Rotar `SECRET_NONCE`.
- Cambios de código en `api/encuesta.js` o `index.html` más allá de verificaciones.
- Cambios en `vercel.json`.

---

Estado: `Draft`. Cambiar a `Aprobado` una vez revisado. Luego: `/spec-impl 04-mover-entorno-a-vercel`.
