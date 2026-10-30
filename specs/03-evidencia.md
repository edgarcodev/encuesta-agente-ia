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

*(Pendiente: pasos 5–7.)*
