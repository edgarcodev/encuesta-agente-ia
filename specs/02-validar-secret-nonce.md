# SPEC 02 — Validar `SECRET_NONCE` real en el servidor

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-10-29
> **Objective:** Hacer que `api/encuesta.js` acepte solo tokens iguales al valor real de `SECRET_NONCE`, con el secreto embebido en `index.html`, para que el endpoint deje de aceptar cualquier cadena de 20–50 caracteres.

## Scope

**In:**

- Modificar `api/encuesta.js`: sustituir el chequeo de longitud actual (`token.length < 20 || token.length > 50`) por una comparación exacta `token === process.env.SECRET_NONCE`.
- Modificar `api/encuesta.js`: si `SECRET_NONCE` no está definida o está vacía en el entorno, responder 500 y no guardar nada (fail closed).
- Modificar `index.html`: eliminar el nonce aleatorio generado en `sessionStorage` (`encuesta_nonce`) y enviar como `token` el valor literal de `SECRET_NONCE`.
- Verificar en local con `vercel dev` + curl los cuatro casos: token correcto, token incorrecto, sin token, `SECRET_NONCE` ausente.
- Asegurar que `SECRET_NONCE` existe en el dashboard de Vercel con el mismo valor que en `.env` antes del despliegue (sin migrar el resto de variables).
- Actualizar en `AGENTS.md` el bullet de seguridad que hoy afirma que el servidor "never compares against `SECRET_NONCE`".

**Out of scope (for future specs):**

- Rate limiting del endpoint (SPEC 03).
- Migración completa de variables de entorno al dashboard de Vercel (SPEC 04).
- Endpoint que emite tokens HMAC firmados (candidato a spec propia si el threat model crece).
- Cualquier validación adicional del objeto `datos` (estructura de preguntas, tipos de campo).
- Cambios en el frontend `index.html` más allá de la constante `NONCE`.

## Data model

This feature introduces no new data structures. It reuses the existing model:

- `token` (string, en el body del POST): pasa a contener el valor literal de la variable de entorno `SECRET_NONCE`.
- `process.env.SECRET_NONCE` (string): ya existe en `.env` y `.env.example`; hasta ahora era código muerto.

## Implementation plan

1. Leer `api/encuesta.js` actual y confirmar el chequeo de longitud de la línea 8.
2. Modificar `api/encuesta.js`: tras extraer `token` del body, comprobar que `process.env.SECRET_NONCE` es un string no vacío; si no lo es, `console.error` y responder 500 `{ "error": "Configuración del servidor incompleta" }`. Después, sustituir el chequeo de longitud por `token !== process.env.SECRET_NONCE` → 401 `{ "error": "Token inválido" }` (mensaje actual, sin revelar la causa). Verificación manual: las demás ramas (405, 400, inserción) no cambian.
3. Verificación local con `vercel dev` y curl, usando el valor de `.env` leído en la shell (sin escribir el secreto en la evidencia): (a) sin `token` → 401; (b) token basura de 30 caracteres → 401; (c) token correcto con `datos` válidos → 201; (d) entorno sin `SECRET_NONCE` → 500. Registrar la evidencia de los cuatro casos.
4. Modificar `index.html`: reemplazar el IIFE de las líneas 191–198 por `const NONCE = '<valor literal de SECRET_NONCE>'`, eliminando la lectura y escritura de `sessionStorage.encuesta_nonce`. Verificación: completar la encuesta en el navegador contra `vercel dev` → el POST devuelve 201 y aparece la fila en Supabase.
5. Comprobar en el dashboard de Vercel (Settings → Environment Variables) que `SECRET_NONCE` existe en producción con el mismo valor que en `.env`; crearla si falta. No migrar el resto de variables (eso es SPEC 04).
6. Desplegar y hacer smoke test en producción: curl con token correcto → 201, curl con token incorrecto → 401, envío real desde el navegador → 201.
7. Actualizar el bullet de seguridad de `AGENTS.md` para describir el nuevo comportamiento (validación por igualdad contra `SECRET_NONCE`, fail closed si falta la variable).

## Acceptance criteria

- [ ] `api/encuesta.js` ya no contiene `token.length < 20` ni `token.length > 50`.
- [ ] Un POST con el token igual a `SECRET_NONCE` y `datos` válidos devuelve 201 y guarda la fila en Supabase.
- [ ] Un POST con un token de longitud válida pero distinto al secreto devuelve 401.
- [ ] Un POST sin `token` devuelve 401.
- [ ] Un POST con `SECRET_NONCE` ausente o vacía en el entorno devuelve 500 y no guarda nada.
- [ ] `index.html` envía como `token` el valor literal de `SECRET_NONCE` y ya no genera ni lee `sessionStorage.encuesta_nonce`.
- [ ] Completar la encuesta en el navegador contra `vercel dev` devuelve 201.
- [ ] En producción desplegada: curl con token correcto → 201 y curl con token incorrecto → 401.
- [ ] El bullet de seguridad de `AGENTS.md` ya no afirma que el servidor solo valida la longitud.

## Decisions

- **Yes:** secreto embebido literal en `index.html`. No hay build step, así que es la única forma de que el cliente envíe el valor real; es además lo que recomienda la auditoría (`auditoria/RECOMENDACIONES.md`).
- **No:** endpoint con token HMAC firmado. Más seguro porque el secreto nunca sale del servidor, pero añade un endpoint y lógica de firma; si hace falta, va en su propia spec.
- **No:** `?nonce=` en la URL de la encuesta. La encuesta se comparte en redes sociales (Facebook, WhatsApp, etc. según `obtenerFuente()`), así que el secreto se filtraría públicamente.
- **Yes:** fail closed si falta `SECRET_NONCE`. Consistente con el chequeo existente de `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`: nunca se guarda una encuesta sin validación real.
- **No:** conservar el chequeo de longitud junto a la igualdad. La igualdad lo subsume, y el valor de ejemplo en `.env.example` mide 17 caracteres (<20), por lo que mantenerlo podría romper el endpoint.
- **No:** `crypto.timingSafeEqual`. La comparación con `===` basta; un ataque de timing remoto sobre HTTP es impracticable en este contexto.
- **Yes:** mantener el mensaje 401 `"Token inválido"` sin detallar la causa. No se revela al atacante si falló el valor o el entorno.
- **Yes:** actualizar `AGENTS.md` en esta spec. El bullet de seguridad queda en falso tras el cambio y un agente futuro podría "revertirlo" por error.

## Risks

| Risk | Mitigation |
|------|------------|
| El valor embebido en `index.html` no coincide con `SECRET_NONCE` del entorno → todos los envíos legítimos reciben 401 | Verificación curl local (paso 3) y smoke test en producción (paso 6) antes de marcar `Implemented`; rotar el secreto siempre en los tres lugares a la vez (`.env`, dashboard de Vercel, `index.html`) |
| `SECRET_NONCE` no está definida en Vercel → fail closed devuelve 500 en producción | El paso 5 verifica/crea la variable en el dashboard antes del despliegue |
| El secreto queda visible en el HTML público (view-source) y en el repo | Aceptado: el endpoint no maneja credenciales; la defensa de fondo llega con rate limiting (SPEC 03) |

## What is **not** in this spec

- Rate limiting o autenticación de usuario (SPEC 03).
- Migración de variables de entorno a Vercel (SPEC 04).
- Tokens firmados/HMAC o rotación automática de secretos.
- Validación del contenido de `datos`.
- Cambios en `vercel.json` (cerrado en SPEC 01).
