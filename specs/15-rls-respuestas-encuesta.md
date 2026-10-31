# SPEC 15 — Row Level Security (RLS) en Supabase para `respuestas_encuesta`

> **Status:** Aprobado
> **Depends on:** SPEC 08, SPEC 13
> **Date:** 2026-10-31
> **Objective:** Configurar políticas RLS en Supabase para proteger la tabla `respuestas_encuesta`. El API serverless sigue usando `service_role` (bypass RLS), pero las queries directas desde el dashboard (con `anon` key) deben respetar RLS.

## Contexto

Actualmente `respuestas_encuesta` tiene RLS habilitado pero **sin políticas** — esto bloquea todo acceso vía PostgREST, incluyendo el dashboard que usa `SUPABASE_ANON_KEY` con usuarios autenticados.

## Scope

**In:**

- Crear migración `0003_rls_respuestas_encuesta.sql` con políticas SELECT para `authenticated`.
- Crear migración `0003_rls_respuestas_encuesta_vendedores.sql` (misma lógica para la otra tabla).
- Actualizar `AGENTS.md` con las políticas RLS activas.
- Verificar con queries directas que las políticas funcionan.

**Out of scope:**

- Roles diferenciados (admin vs viewer) — SPEC futuro.
- UPDATE/DELETE policies — no se necesita por ahora (solo lectura desde dashboard).
- RLS en `rate_limits` — ya está configurado sin políticas (correcto).

## Políticas propuestas

| Política | Tabla | Rol | Operación | Condición |
|----------|-------|-----|-----------|-----------|
| `Dashboard puede leer respuestas` | `respuestas_encuesta` | `authenticated` | SELECT | `auth.uid() IS NOT NULL` |
| `Dashboard puede leer respuestas vendedores` | `respuestas_encuesta_vendedores` | `authenticated` | SELECT | `auth.uid() IS NOT NULL` |

**Nota:** `service_role` bypass RLS automáticamente — no necesita políticas explícitas para INSERT.

## Implementation plan

1. **Crear `supabase/migrations/0003_rls_respuestas_encuesta.sql`**:
   ```sql
   -- Política: usuarios autenticados pueden leer todas las respuestas
   create policy "authenticated_read" on public.respuestas_encuesta
     for select to authenticated
     using (auth.uid() IS NOT NULL);
   ```

2. **Crear `supabase/migrations/0003_rls_respuestas_encuesta_vendedores.sql`** (misma lógica para la tabla de vendedores).

3. **Aplicar migraciones** en el SQL editor de Supabase (producción).

4. **Verificar**:
   - `authenticated` puede hacer SELECT → ✅
   - `anon` NO puede hacer SELECT → ✅
   - `service_role` sigue pudiendo INSERT → ✅
   - API de encuestas sigue funcionando → ✅

5. **Actualizar `AGENTS.md`** con documentación de RLS.

## Acceptance criteria

- [ ] Migración `0003_*` creada y aplicada en producción.
- [ ] `authenticated` puede hacer SELECT en `respuestas_encuesta`.
- [ ] `anon` NO puede hacer SELECT en `respuestas_encuesta`.
- [ ] `service_role` sigue pudiendo INSERT (bypass RLS).
- [ ] API de encuestas (`api/encuesta.js`) sigue funcionando sin cambios.
- [ ] Dashboard puede leer datos si el usuario está autenticado.
- [ ] `AGENTS.md` documenta las políticas RLS activas.

## Decisions

- **Yes:** SELECT para todos los `authenticated` — roles finos vienen después.
- **No:** INSERT policy — el API usa `service_role` que ya bypass RLS.
- **No:** UPDATE/DELETE policies — no se necesitan aún.
- **Yes:** Sin `IF NOT EXISTS` en la migración — sigue la convención del proyecto.
- **Yes:** Misma política para ambas tablas (`respuestas_encuesta` y `respuestas_encuesta_vendedores`).

## Risks

| Risk | Mitigation |
|------|------------|
| Política muy permisiva (todos los auth leen todo) | Roles diferenciados vienen en SPEC futuro |
| API deja de funcionar | `service_role` bypass RLS — no se ve afectado |
| Migración falla si ya existe | Seguir convención: sin `IF NOT EXISTS` — el error indica que ya existe |
