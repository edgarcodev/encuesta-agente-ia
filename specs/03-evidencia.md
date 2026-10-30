# Evidencia — SPEC 03 (rate limiting por IP en `/api/encuesta`)

> Registro de verificaciones realizadas durante la implementación.
> Se actualiza conforme avanza cada paso del plan.

---

## Paso 1 — Migración `supabase/migrations/0001_rate_limits.sql` (validación local)

Entorno: PostgreSQL 16.14 efímero en `/tmp/opencode/pg03` (socket aislado, puerto 5433),
con roles `anon` / `authenticated` / `service_role` (bypassrls) y `alter default privileges`
simulando los grants por defecto de Supabase (el gotcha de `EXECUTE` anotado en AGENTS.md).

| Comprobación | Resultado |
|---|---|
| 1.ª aplicación de la migración | `CREATE TABLE / ALTER TABLE / REVOKE / CREATE FUNCTION / REVOKE` — exit 0 |
| 2.ª aplicación (sin `ON_ERROR_STOP`) | `ERROR: relation "rate_limits" already exists` en la línea 22 (el resto continúa, comportamiento estándar de psql) |
| 2.ª aplicación (con `ON_ERROR_STOP=1`) | exit 3, falla en voz alta ✅ |
| RLS / políticas | `relrowsecurity = t`, `politicas = 0` |
| `has_function_privilege` EXECUTE | `anon=false, authenticated=false, public=false, service_role=true` |
| `has_table_privilege` SELECT | `anon=false, authenticated=false, service_role=true` |
| RPC: 1.ª, 2.ª y 3.ª llamada | `{"count":1..3, "retry_after":600}` |
| Ventana expirada (`window_start = now() - 11 min`) → llamada | `{"count":1, "retry_after":600}` y `window_start` reseteado a `now()` |
| Clave `'unknown'` (sin IP) | `{"count":1, "retry_after":600}` |
| Borde de cierre (`window_start = now() - 9 min 59.5 s`) → llamada | `{"count":2, "retry_after":1}` (mínimo 1 respetado) |
| `set role anon` → llamar a la RPC | `ERROR: permission denied for function increment_rate_limit` ✅ (fail closed) |

El servidor local se detuvo después de la validación (`pg_ctl stop -m fast`).

---

## Paso 2 — Migración aplicada en Supabase (producción)

Aplicada **una sola vez** vía `apply_migration(name="0001_rate_limits", ...)` con el contenido
idéntico al del archivo del repo.

**Pre-chequeo (antes de aplicar):**

```sql
select
  (select count(*) from pg_class ... where relname = 'rate_limits')       as tabla_existe,   -- 0
  (select count(*) from pg_proc  ... where proname = 'increment_rate_limit') as funcion_existe; -- 0
```

Resultado: `[{"tabla_existe":0,"funcion_existe":0}]` — no había nada previo.

**Aplicación:** `{"success": true}`.

**Registro en el historial de migraciones:**

```sql
select version, name from supabase_migrations.schema_migrations order by version desc limit 5;
-- [{"version":"20261029232952","name":"0001_rate_limits"}]
```

**Verificación de objetos y privilegios (producción):**

| Comprobación SQL | Resultado |
|---|---|
| `pg_class` + `pg_policy` sobre `rate_limits` | `rls: true`, `politicas: 0` |
| `has_function_privilege('anon', 'increment_rate_limit(text)', 'EXECUTE')` | `false` ✅ |
| `has_function_privilege('authenticated', ..., 'EXECUTE')` | `false` |
| `has_function_privilege('public', ..., 'EXECUTE')` | `false` |
| `has_function_privilege('service_role', ..., 'EXECUTE')` | `true` ✅ (esperado: `false, true`) |
| `has_table_privilege` SELECT (anon / authenticated / service_role) | `false / false / true` |
| Firma y lenguaje de la función | `increment_rate_limit(p_ip text)`, `lanname = sql` |

**Re-aplicación (debe fallar en voz alta):**

```
ERROR: 42P07: relation "rate_limits" already exists
```

→ La migración está aplicada exactamente una vez ✅.

---

## Paso 3 — `api/encuesta.js` (cambio de código)

- `node --check` en modo CommonJS y ESM: exit 0 (sintaxis válida).
- Orden nuevo: 405 → extracción de IP → chequeo `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` (500) →
  RPC de rate limit → `SECRET_NONCE` (401) → `datos` (400) → inserción (201).
- `RATE_LIMIT_MAX = 5` a nivel de módulo; el límite vive en JS, no en SQL.
- Fail open: cualquier fallo del RPC (`!response.ok` o excepción) → `console.error` y continúa.

---

## Paso 4 — Verificación local (`vercel dev` + curl)

Entorno: `vercel dev` (CLI 65.7.0) en `http://localhost:3003`, `.env` local apuntando a
Supabase **producción** (por lo que las filas de prueba nacieron en producción y se limpian
en el paso 6). Estado inicial: `rate_limits` vacía (0 filas), 0 filas `verif03`.

| # | Caso | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| a | `GET /api/encuesta` | 405 y **sin** fila en `rate_limits` | `HTTP/1.1 405`, JSON; `rate_limits` = 0 filas ✅ |
| b | 4 × POST con token basura | 401 ×4 pero `count` sube a 4 | 4 × `401 {"error":"Token inválido"}`; fila `ip="::1"`, `count=4` ✅ |
| c | POST válido con 10 claves `verif03_1..10` | 201 (`count` = 5) | `201 {"success":true}`; `count=5`; 1 fila `verif03` ✅ |
| d | 6.º POST (válido) | 429 + `Retry-After` numérico + body con `error` | `429`, cabecera `retry-after: 555`, `{"error":"Demasiados envíos desde esta conexión. Inténtalo de nuevo en unos minutos."}` ✅ |
| d' | POST con **token basura** estando agotada la cuota | 429 (la cuota se gasta aunque el token sea basura) | `429`, `retry-after: 553` ✅ |
| e | `update rate_limits set window_start = now() - interval '11 minutes'` → POST válido | 201 de nuevo | `update` OK → `201 {"success":true}` ✅ |
| f | Petición sin cabeceras de IP | contada bajo `'unknown'` | fila `ip="unknown"`, `count=1` ✅ (ver nota) |

**Nota sobre (f):** no se pudo provocar vía `curl` porque **`vercel dev` inyecta él mismo**
`x-real-ip`/`x-forwarded-for` en toda petición local (aparecían `::1` y `::ffff:127.0.0.1`
independientemente de lo que enviara el cliente). Se verificó invocando el `handler` con un
`req` sin esas cabeceras: respondió `401` (token basura) **y creó la fila `ip="unknown"`** en
`rate_limits`, lo que confirma la cadena de fallback `x-real-ip → x-forwarded-for → 'unknown'`.

Filas creadas durante la verificación local:

- `rate_limits`: `::1` (count 2), `::ffff:127.0.0.1` (count 1), `unknown` (count 1).
- `respuestas_encuesta`: 4 filas con `verif03` (pasos c, e, f-http y f-handler).
- Log de `vercel dev`: sin errores (`Rate limit RPC falló` / `Rate limit RPC error` no aparecen).

---

## Paso 5 — Deploy a Vercel + smoke test en producción

**Despliegue:**

- `vercel link --project encuesta-agente-ia` (el directorio no estaba enlazado; solo creó
  `.vercel/project.json`… en esta versión del CLI solo rotó `VERCEL_OIDC_TOKEN` en `.env.local`
  y regeneró `.vercel/README.txt`, que se restauró).
- `vercel deploy --prod --yes` → `encuesta-agente-h8dgevurg-codeturas.vercel.app`
  → Producción URL: `https://encuesta-agente-ia.vercel.app`.
- La protección de despliegue no bloquea `/api/encuesta` (verificado con curl sin cookies).

**Smoke test contra `https://encuesta-agente-ia.vercel.app`:**

| Fase | Caso | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| 0 | `GET /api/encuesta` | 405 | `405 application/json` `{"error":"Método no permitido"}` ✅ |
| 1 | 4 × POST token basura | 401 ×4, `count` = 4 | 4 × `401 {"error":"Token inválido"}`; fila `ip="179.6.100.229"` (IP real) `count=4` ✅ |
| 2 | 5.º POST válido `verif03_*` | 201 (`count` = 5) | `201 {"success":true}` ✅ |
| 3 | 6.º POST válido | 429 + `Retry-After` | `HTTP/2 429`, `retry-after: 581`, body con `error` ✅ |
| 4 | POST con **`x-forwarded-for: 203.0.113.99`** y **`x-real-ip: 198.51.100.77`** falsificadas | sigue contando la IP real (429) | `429`, `retry-after: 575`; contador de la IP real subió a **7**; **0 filas** con las IPs falsificadas ✅ |
| 5 | `update … window_start = now() - interval '11 minutes'` → POST válido | 201 de nuevo | `201 {"success":true}` y siguiente también `201` ✅ |

**Estado de la BD tras el smoke test (a limpiar en el paso 6):**

- `rate_limits`: `179.6.100.229` (count 2, ventana reiniciada), `::1` (2), `::ffff:127.0.0.1` (1), `unknown` (1).
- `respuestas_encuesta`: **7** filas con `verif03` (4 locales + 3 de producción).

**Nota:** el smoke test se ejecutó contra la IP pública real del operador; por eso la ventana
de esa IP se reinició manualmente al final para no dejar cuota agotada en el equipo.

---

## Paso 6 — Limpieza de datos de prueba

**Inventario previo (antes de borrar):**

| Tabla | Contenido |
|---|---|
| `respuestas_encuesta` | 13 filas = **6 reales** (ids 1–6, ago–sept, shape `p1/p2/…`) + **7 `verif03`** (ids 11–17) |
| `rate_limits` | 4 filas: `179.6.100.229` (IP real, 2), `::1` (2), `::ffff:127.0.0.1` (1), `unknown` (1) |

**Borrado (transacción única):**

```sql
begin;
delete from public.respuestas_encuesta where datos::text like '%verif03%';
delete from public.rate_limits;
commit;
```

**Verificación posterior:**

| Comprobación | Resultado |
|---|---|
| `respuestas_encuesta`: total | **6** (las 6 reales intactas, `min_id=1`, `max_id=6`) ✅ |
| `respuestas_encuesta`: filas con `verif03` | **0** ✅ |
| `rate_limits`: filas | **0** ✅ |

No quedan datos de prueba en la BD ✅.

---

## Verificación de criterios de aceptación (15/15 ✅)

| # | Criterio | Evidencia | OK |
|---|---|---|---|
| 1 | Existe `supabase/migrations/0001_rate_limits.sql` con tabla y función | archivo (2976 B) contiene `create table public.rate_limits` y `create or replace function public.increment_rate_limit` | ✅ |
| 2 | Aplicada una única vez; re-aplicar falla | `schema_migrations`: `migraciones_0001 = 1`; objetos: `tablas_rate_limits = 1`, `funciones = 1`; reintento → `ERROR: 42P07 relation "rate_limits" already exists` (exit 3) | ✅ |
| 3 | `has_function_privilege` `anon=false` / `service_role=true` | producción: `anon_exec=false`, `service_exec=true` | ✅ |
| 4 | RLS habilitado, 0 políticas | producción: `rls=true`, `politicas=0` | ✅ |
| 5 | GET → 405 sin incrementar contador | producción: `GET -> 405`; el POST 400 previo dejó `count=1` y tras el GET **seguía en 1** | ✅ |
| 6 | Primeros 5 POST con código normal (401/400/201) y todos cuentan | producción: 4 × `401` + 1 × `201` = count 5; adicional: token válido + 3 claves → `400 {"error":"Datos insuficientes"}` **y sí cuenta** | ✅ |
| 7 | 6.º POST → 429 + `Retry-After` numérico + body `error` | local `retry-after: 555`; producción `HTTP/2 429` `retry-after: 581`; body `{"error":"Demasiados envíos desde esta conexión. Inténtalo de nuevo en unos minutos."}` | ✅ |
| 8 | Token inválido consume cuota (429 con token basura) | local: `429`, `retry-after: 553` con token basura | ✅ |
| 9 | Tras expirar ventana → 201 | local (e) `201`; producción (fase 5) `201` y siguiente también `201` | ✅ |
| 10 | Sin cabeceras de IP → `'unknown'` | handler invocado con `req.headers = {}` → fila `ip="unknown"`, `count=1` (ver nota: `vercel dev` inyecta cabeceras) | ✅ |
| 11 | Producción: `x-forwarded-for` falsificada cuenta la IP real | con `x-forwarded-for: 203.0.113.99` + `x-real-ip: 198.51.100.77` → `429`; IP real `179.6.100.229` subió a 7; `filas_spoof = 0` | ✅ |
| 12 | POST válido 10 claves `verif03_*` → 201 y guarda fila | local (c) y producción (fase 2): `201 {"success":true}` + fila creada (limpiada en paso 6) | ✅ |
| 13 | `index.html` sin cambios y el 429 aparece en el resumen | `git diff main -- index.html` → vacío; ejecutando el código real de `index.html` (líneas 1002–1027) con un `fetch` simulado que devuelve el 429 de producción: `envioResult = {"success":false,"error":"Demasiados envíos desde esta conexión…"}` y la línea 1282 pinta `❌ Error al enviar: Demasiados envíos desde esta conexión. Inténtalo de nuevo en unos minutos.` | ✅ |
| 14 | Sin datos de prueba | `respuestas_encuesta`: `verif03 = 0`, `total = 6` (las reales, ids 1–6); `rate_limits`: **0 filas** | ✅ |
| 15 | `AGENTS.md` no afirma "No rate limiting" | `grep "No rate limiting"` → sin resultados; nuevo bullet `Rate limiting: 5 POST / 10 min por IP` presente | ✅ |

**Test adicional del criterio 6 (rama 400):** POST a producción con token válido pero solo
3 claves → `400 {"error":"Datos insuficientes"}` y el contador de la IP real pasó a 1
(la rama 400 también consume cuota). El GET posterior lo dejó en 1 (no cuenta).
Esa fila de prueba se borró acto seguido para no violar el criterio 14.

**Estado final de la BD:** `rate_limits` = 0 filas; `respuestas_encuesta` = 6 filas reales,
0 con `verif03`.

---

*(SPEC 03: estado `Implementado`, 15/15 criterios verificados.)*
