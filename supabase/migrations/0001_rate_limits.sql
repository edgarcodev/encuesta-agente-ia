-- SPEC 03 — Rate limiting por IP en /api/encuesta
-- Migración 0001: tabla rate_limits + RPC increment_rate_limit.
--
-- IMPORTANTE: aplicar exactamente UNA VEZ en el SQL editor de Supabase
-- (producción). El create table va SIN "if not exists" para que una segunda
-- aplicación falle en voz alta.
--
-- Verificación tras aplicar:
--   \d rate_limits   -- tabla con RLS activo y sin políticas
--   select has_function_privilege('anon', 'increment_rate_limit(text)', 'EXECUTE'),
--          has_function_privilege('service_role', 'increment_rate_limit(text)', 'EXECUTE');
--   -- esperado: false, true

-- ---------------------------------------------------------------------------
-- Tabla: una fila por IP con su ventana fija de 10 minutos (sin basura por
-- ventana: la fila se resetea en lugar de crear filas nuevas).
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  ip           text primary key,        -- 'unknown' si no hay cabecera de IP
  window_start timestamptz not null,    -- inicio de la ventana actual de 10 min
  count        integer not null         -- peticiones POST contadas en la ventana
);

-- RLS habilitado SIN políticas: nadie entra vía PostgREST.
alter table public.rate_limits enable row level security;

-- Solo service_role puede tocar la tabla (service_role bypasea RLS).
revoke all on public.rate_limits from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC atómica (security invoker, el default; el caller es service_role, que
-- bypasea RLS — sin security definer se evitan los gotchas de search_path).
--
-- INSERT ... ON CONFLICT (ip) DO UPDATE:
--   - si window_start + 10 min <= now()  -> reset: count = 1, window_start = now()
--   - si no                              -> count = count + 1
-- Retorna jsonb: { "count": <n>, "retry_after": <segundos hasta cerrar la ventana, mínimo 1> }
--
-- El límite (5) vive en api/encuesta.js como RATE_LIMIT_MAX; esta función solo cuenta.
-- ---------------------------------------------------------------------------
create or replace function public.increment_rate_limit(p_ip text)
returns jsonb
language sql
as $$
  insert into public.rate_limits as rl (ip, window_start, count)
  values (p_ip, now(), 1)
  on conflict (ip) do update set
    window_start = case
      when rl.window_start + interval '10 minutes' <= now() then now()
      else rl.window_start
    end,
    count = case
      when rl.window_start + interval '10 minutes' <= now() then 1
      else rl.count + 1
    end
  returning jsonb_build_object(
    'count', rl.count,
    'retry_after', greatest(
      1,
      ceil(extract(epoch from (rl.window_start + interval '10 minutes' - now())))::integer
    )
  );
$$;

-- EXECUTE solo para service_role (público, anon y authenticated fuera).
revoke execute on function public.increment_rate_limit(text) from public, anon, authenticated;
