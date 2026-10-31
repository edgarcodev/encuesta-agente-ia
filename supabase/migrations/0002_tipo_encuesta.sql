-- SPEC 08 — Agregar columna tipo_encuesta a respuestas_encuesta
-- Migración 0002: columna + CHECK constraint.
--
-- IMPORTANTE: aplicar exactamente UNA VEZ en el SQL editor de Supabase
-- (producción). Los ALTER van SIN "if not exists" para que una segunda
-- aplicación falle en voz alta.
--
-- Registros existentes quedan con tipo_encuesta = NULL (sin backfill).
--
-- Verificación tras aplicar:
--   \d respuestas_encuesta   -- debe mostrar tipo_encuesta text
--   -- y la constraint chk_tipo_encuesta

alter table public.respuestas_encuesta add column tipo_encuesta text;

alter table public.respuestas_encuesta
  add constraint chk_tipo_encuesta
  check (tipo_encuesta in ('compradores', 'vendedores', 'proveedores'));
