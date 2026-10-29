# SPEC 03 — Rate limiting por IP en `/api/encuesta`

> **Status:** Aprobado
> **Depends on:** SPEC 02
> **Date:** 2026-10-29
> **Objective:** Limitar `/api/encuesta` a 5 peticiones POST cada 10 minutos por IP usando un contador persistente en Supabase, para que un script no pueda volcar respuestas masivas.

## Scope

**In:**

- Nuevo archivo `supabase/migrations/0001_rate_limits.sql`: tabla `rate_limits`, RLS habilitado sin políticas, revocaciones de acceso a `anon`/`authenticated`, y función RPC `increment_rate_limit(p_ip text)` atómica.
- Aplicar esa migración **una sola vez** en el SQL editor del proyecto Supabase en producción y verificar objetos y privilegios.
- Modificar `api/encuesta.js`: extraer la IP del cliente, llamar al RPC antes de validar el token, y responder `429` con cabecera `Retry-After` cuando `count > 5`.
- Mover el chequeo de `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` hacia arriba (el RPC los necesita) sin cambiar su comportamiento fail closed.
- Verificar en local con `vercel dev` + curl y en producción con curl: límite, recuperación tras la ventana, y que los GET/405 no consumen cuota.
- Limpieza de los datos de prueba generados durante la verificación (filas `verif03_*` en `respuestas_encuesta` y filas de prueba en `rate_limits`).
- Actualizar en `AGENTS.md` el bullet de seguridad que hoy afirma "No rate limiting", más una nota de la nueva carpeta `supabase/migrations/`.

**Out of scope (for future specs):**

- Cambios en `index.html` (el resumen ya pinta el campo `error` del JSON, línea 1282, así que el mensaje del 429 se muestra sin tocar el frontend).
- Cambios en `vercel.json` (cerrado en SPEC 01).
- Dependencias npm o `package.json` (cero; por eso se eligió Supabase).
- WAF de Vercel o Upstash Redis.
- Migración de variables de entorno al dashboard de Vercel (SPEC 04). Esta spec **no** añade variables nuevas: reutiliza `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`.
- Validación del contenido de `datos` (solo se limita el volumen, no el shape).
- CAPTCHA, rate limiting por token, límite global o por usuario autenticado.

## Data model

```sql
-- supabase/migrations/0001_rate_limits.sql
create table public.rate_limits (
  ip         text primary key,          -- 'unknown' si no hay cabecera de IP
  window_start timestamptz not null,    -- inicio de la ventana actual de 10 min
  count      integer not null           -- peticiones POST contadas en la ventana
);

alter table public.rate_limits enable row level security;  -- sin políticas = nadie entra vía PostgREST

-- RPC atómico (security invoker; el caller es service_role, que bypasea RLS):
--   INSERT ... ON CONFLICT (ip) DO UPDATE:
--     si window_start + 10 min <= now()  -> reset count = 1, window_start = now()
--     si no                              -> count = count + 1
--   retorna jsonb: { "count": <n>, "retry_after": <segundos hasta cerrar la ventana> }
create or replace function public.increment_rate_limit(p_ip text) returns jsonb;
```

Convenciones:

- Ventana **fija por IP, fila única**: una fila por IP viva, nunca basura por ventana.
- `Retry-After` = segundos que faltan para `window_start + 10 minutos` (mínimo 1).
- El límite (`5`) vive en `api/encuesta.js` como `const RATE_LIMIT_MAX = 5`; la función SQL solo cuenta.
- Privilegios: `EXECUTE` revocado a `public`, `anon` y `authenticated`; `service_role` conserva acceso. Verificado con `has_function_privilege`.

## Implementation plan

1. Crear `supabase/migrations/0001_rate_limits.sql` con la tabla `rate_limits`, el `enable row level security` sin políticas, las revocaciones (`revoke all on public.rate_limits from anon, authenticated;` y `revoke execute on function ... from public, anon, authenticated;`) y la función `increment_rate_limit`. El `create table` va **sin** `if not exists` para que una segunda aplicación falle en voz alta.
2. Aplicar la SQL una sola vez en el SQL editor de Supabase (producción). Verificación: `\d rate_limits` muestra la tabla con RLS activo, y `select has_function_privilege('anon', 'increment_rate_limit(text)', 'EXECUTE'), has_function_privilege('service_role', 'increment_rate_limit(text)', 'EXECUTE');` devuelve `false, true`. Guardar la evidencia.
3. Modificar `api/encuesta.js`: tras el chequeo de método, extraer la IP (`req.headers['x-real-ip']` → primera IP de `req.headers['x-forwarded-for']` → `'unknown'`), mover el chequeo de `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` a continuación (mismo 500 actual), y llamar al RPC `POST ${SUPABASE_URL}/rest/v1/rpc/increment_rate_limit` con body `{ p_ip: ip }`. Si `count > 5` → `429` `{ "error": "Demasiados envíos desde esta conexión. Inténtalo de nuevo en unos minutos." }` + `Retry-After: retry_after`. Si el RPC falla → `console.error` y seguir (fail open). El resto (SECRET_NONCE → 401, `datos` → 400, inserción → 201) queda después del rate limit y sin cambios. Verificación manual: las ramas 405/401/400/201 siguen intactas.
4. Verificación local con `vercel dev` + curl, en este orden para no ensuciar la BD: (a) GET → 405 y la fila de `rate_limits` no aparece; (b) 4 POST con `token` inválido → 401 ×4 (pero `count` sube a 4); (c) 1 POST válido con `datos` de 10 claves `verif03_1..10` → 201 (`count` = 5); (d) 1 POST más → 429 con `Retry-After` numérico; (e) `update rate_limits set window_start = now() - interval '11 minutes'` y repetir el POST válido → 201 de nuevo; (f) curl sin cabeceras de IP → se cuenta bajo `'unknown'`. Registrar evidencia.
5. Desplegar a Vercel y smoke test en producción: mismo guion de 6 POST (solo 1 crea fila `verif03_*`), más un curl con cabecera `x-forwarded-for` falsificada que debe seguir contando la IP real (comprobar la fila en `rate_limits`), y reset de ventana para confirmar recuperación.
6. Limpieza de datos de prueba: borrar de `respuestas_encuesta` las filas cuyo `datos` contenga `verif03` y de `rate_limits` las filas creadas durante la verificación (`'unknown'`, IP local y IP de producción). Confirmar que no queda ningún `verif03`.
7. Actualizar `AGENTS.md`: el bullet "No rate limiting, no CAPTCHA..." pasa a describir el límite de 5/10 min por IP vía RPC, y se añade la convención de que el esquema vive versionado en `supabase/migrations/` (solo esquema, aplicada una vez).

## Acceptance criteria

- [ ] Existe `supabase/migrations/0001_rate_limits.sql` con la tabla `rate_limits` y la función `increment_rate_limit`.
- [ ] La migración está aplicada una única vez en Supabase producción; volver a aplicarla produce error de "ya existe".
- [ ] `has_function_privilege('anon', 'increment_rate_limit(text)', 'EXECUTE')` es `false` y para `service_role` es `true`.
- [ ] `rate_limits` tiene RLS habilitado y ninguna política.
- [ ] Un GET a `/api/encuesta` devuelve 405 y no incrementa ningún contador.
- [ ] Los primeros 5 POST desde una misma IP responden con su código normal (401/400/201), aunque todos cuentan.
- [ ] El sexto POST desde esa IP dentro de la ventana devuelve 429 con cabecera `Retry-After` en segundos y body JSON con campo `error`.
- [ ] Un POST con token inválido también consume cuota (429 llega aunque el token sea basura).
- [ ] Tras expirar la ventana (10 min o `window_start` retrocedido manualmente), el siguiente POST vuelve a responder 201.
- [ ] Un POST sin cabeceras de IP se cuenta bajo la clave `unknown`.
- [ ] En producción, un POST con `x-forwarded-for` falsificada sigue contando la IP real (la fila creada en `rate_limits` es la IP real).
- [ ] Un POST válido con 10 claves `verif03_*` sigue devolviendo 201 y guardando la fila (el rate limit no rompe el flujo feliz).
- [ ] `index.html` no tiene cambios y el mensaje del 429 aparece en el resumen de error.
- [ ] No quedan datos de prueba en la BD: ninguna fila con `verif03` en `respuestas_encuesta` y ninguna fila de prueba en `rate_limits`.
- [ ] `AGENTS.md` ya no afirma que el endpoint no tiene rate limiting.

## Decisions

- **Yes:** contador en Supabase. Decisión del usuario: preciso entre instancias y cold starts, sin dependencias npm.
- **No:** mapa en memoria en la función. Se pierde en cold start y no se comparte entre instancias.
- **No:** Vercel WAF. Depende del plan contratado y no se puede probar en local.
- **No:** Upstash Redis / `@upstash/ratelimit`. Requeriría crear `package.json` y una cuenta externa; rompe la convención "no build, no deps".
- **Yes:** carpeta `supabase/migrations/` versionada en el repo. Crea la convención de migraciones que SPEC 08+ necesita y deja traza en git de qué objetos existen en la BD.
- **Yes:** fila única por IP con reset de ventana. Crecimiento acotado al nº de IPs únicas; no hace falta limpieza de filas viejas por ventana.
- **Yes:** RPC atómico `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`. Una sola llamada PostgREST y cero carreras.
- **No:** SELECT + UPSERT desde la función. Ventana de carrera: dos requests simultáneos subestiman el contador.
- **No:** `security definer`. Con `security invoker` basta porque el caller es `service_role` (bypasea RLS); se evitan los gotchas de `search_path` anotados en AGENTS.md.
- **Yes:** contar **antes** de validar token/datos (todas las POST, incl. errores). Decisión del usuario: un ataque de fuerza bruta contra el token también gasta cuota.
- **Yes:** mover el chequeo de `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` por encima del chequeo de token. El RPC los necesita. Consecuencia documentada: si faltan credenciales y el token es inválido, ahora responde 500 en vez de 401 — sigue fail closed.
- **Yes:** fail open con `console.error` si el RPC falla (caída de Supabase). El rate limiting es defensa en profundidad; el gate real sigue siendo `SECRET_NONCE`. Punto reversible si se prefiere fail closed.
- **Yes:** priorizar `x-real-ip` y solo caer a `x-forwarded-for`. `x-real-ip` lo pone Vercel y no es spoofeable por el cliente.
- **Yes:** clave `'unknown'` cuando no hay IP (decisión del usuario). Nunca deja el endpoint sin contar.
- **Yes:** mensaje 429 amigable y en español. `index.html` pinta el campo `error` directamente en el resumen para el usuario final.
- **No:** `create table if not exists`. Aplicar la migración dos veces debe fallar en voz alta (lección de AGENTS.md: cada migración exactamente una vez).

## Risks

| Risk | Mitigation |
|------|------------|
| Usuarios móviles detrás de CGNAT comparten IP pública → un tercero puede agotar la cuota de otro | Cuota holgada (5) y ventana corta (10 min); el frontend guarda respuestas en `localStorage` y `Retry-After` indica cuándo reintentar |
| Cliente falsifica `x-forwarded-for` para evadir el límite | Priorizar `x-real-ip` (lo pone Vercel); smoke test en producción con cabecera falsa (paso 5) |
| RPC caído (outage de Supabase) → sin rate limiting | Fail open documentado en Decisions + `console.error` para detectarlo en logs; el token sigue validando |
| Migración aplicada dos veces | `create table` sin `if not exists` falla en voz alta; paso 2 la aplica exactamente una vez |
| +1 llamada PostgREST por envío suma latencia | Despreciable sobre un envío único por usuario (<100 ms añadidos) |

## What is **not** in esta spec

- Cambios en `index.html` o `vercel.json`.
- `package.json` o cualquier dependencia.
- WAF de Vercel, Upstash u otro servicio externo.
- Migración de variables de entorno a Vercel (SPEC 04).
- Validación del contenido de `datos`, CAPTCHA o límite por usuario.
- Rate limiting por token o límite global.
