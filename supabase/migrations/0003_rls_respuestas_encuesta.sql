-- SPEC 15 — RLS para respuestas_encuesta
-- Migración 0003: política SELECT para usuarios autenticados.
--
-- IMPORTANTE: aplicar exactamente UNA VEZ en el SQL editor de Supabase
-- (producción). El create policy va SIN "if not exists" para que una segunda
-- aplicación falle en voz alta.
--
-- service_role bypass RLS automáticamente — no necesita políticas.
-- anon queda sin acceso (sin política).
--
-- Verificación tras aplicar:
--   select has_table_privilege('anon', 'public.respuestas_encuesta', 'select');
--   -- esperado: false
--   select has_table_privilege('authenticated', 'public.respuestas_encuesta', 'select');
--   -- esperado: true

create policy "authenticated_read" on public.respuestas_encuesta
  for select to authenticated
  using (auth.uid() IS NOT NULL);
