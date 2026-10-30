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

*(Pendiente: pasos 3–7.)*
