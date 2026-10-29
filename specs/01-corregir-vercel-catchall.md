# SPEC 01 — Corregir vercel.json catch-all para que /api/* no sea interceptado

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-10-29
> **Objective:** Modificar vercel.json para que las peticiones a /api/* no sean reescritas a index.html y ejecuten la función serverless correspondiente.

## Scope

**In:**

- Modificar `vercel.json` para agregar un rewrite de `/api/(.*)` hacia `/api/$1` antes del catch-all existente.
- Verificar que `/api/encuesta` ejecute `api/encuesta.js` y no devuelva `index.html`.

**Out of scope (for future specs):**

- Cambiar la estructura de carpetas de las funciones serverless.
- Agregar middlewares de auth o rate limiting en vercel.json (va en SPEC 03).
- Cualquier cambio en `api/encuesta.js` (va en SPEC 02 y posteriores).

## Data model

This feature introduces no new data structures. It reuses the existing model.

## Implementation plan

1. Leer `vercel.json` actual para confirmar el catch-all actual.
2. Modificar `vercel.json` agregando `{ "source": "/api/(.*)", "destination": "/api/$1" }` como primer elemento del array `rewrites`, antes del catch-all `{ "source": "/(.*)", "destination": "/" }`.
3. Verificar manualmente que el archivo JSON resultante sea válido.
4. (Verificación) Desplegar en Vercel o usar Vercel CLI local y confirmar que `POST /api/encuesta` devuelve JSON y no HTML.

## Acceptance criteria

- [ ] `vercel.json` contiene dos reglas en `rewrites`: la primera para `/api/(.*)` y la segunda catch-all para `/(.*)`.
- [ ] `POST /api/encuesta` devuelve `Content-Type: application/json` y no `text/html`.
- [ ] El cuerpo de la respuesta de `POST /api/encuesta` es JSON válido (ej. `{ "success": true }` o un error JSON), no el HTML de `index.html`.

## Decisions

- **Yes:** Agregar la regla de API antes del catch-all en el mismo archivo `vercel.json`. Es la forma más simple y no requiere crear archivos adicionales.
- **No:** Usar un archivo `vercel.json` separado por entorno. El catch-all solo afecta al despliegue de Vercel; localmente no se usa.

## Risks

| Risk | Mitigation |
|------|------------|
| El orden de las reglas en `rewrites` importa; si el catch-all va primero, sigue sin funcionar | Verificar que la regla `/api/(.*)` esté en la primera posición del array |
| Otras rutas estáticas (imágenes, CSS) podrían verse afectadas | El catch-all sigue presente para todo lo que no sea `/api/*`, por lo que los assets estáticos siguen funcionando |

## What is **not** in this spec

- Cambios en `api/encuesta.js`.
- Rate limiting o autenticación en el endpoint.
- Cualquier cambio en el frontend `index.html`.
