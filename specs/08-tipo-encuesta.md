# SPEC 08 — Agregar columna `tipo_encuesta` a `respuestas_encuesta`

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 05, SPEC 06
> **Date:** 2026-10-30
> **Objective:** Agregar columna `tipo_encuesta` (`'compradores'`, `'vendedores'`, `'proveedores'`) a la tabla `respuestas_encuesta` y actualizar frontend + API para que cada encuesta identifique su tipo al guardar.

## Scope

**In:**

- Crear migración `0002_tipo_encuesta.sql` que:
  - Agrega columna `tipo_encuesta text` a `public.respuestas_encuesta` (nullable).
  - Agrega restricción `CHECK (tipo_encuesta IN ('compradores', 'vendedores', 'proveedores'))`.
  - Sin `IF NOT EXISTS` — sigue la convención: falla si ya existe.
  - Registros existentes quedan con `NULL`.
- Modificar `api/encuesta.js` para leer `tipo_encuesta` del body y pasarlo a Supabase.
- Modificar `app.js` para incluir `tipo_encuesta: 'compradores'` en el POST.
- Modificar `references/vendedores/api/encuesta.js` para incluir `tipo_encuesta: 'vendedores'`.
- Actualizar `AGENTS.md` con la nueva columna y el patrón para futuros tipos.

**Out of scope (for future specs):**

- Migrar registros existentes (históricos quedan con `NULL`).
- Crear endpoint para `proveedores` (aún no existe el template).
- Filtrado por tipo en el dashboard (Fase 3).
- RLS policies basadas en tipo (Fase 3).
- Cambios en `index.html`, `styles.css`, ni en el flujo de la encuesta.

## Data model

Tabla `public.respuestas_encuesta` — nueva columna:

```
tipo_encuesta  text  nullable  CHECK IN ('compradores', 'vendedores', 'proveedores')
```

El JSONB `datos` no cambia. Se envía `{ datos, token, tipo_encuesta }` en el POST.

## Implementation plan

1. **Crear `supabase/migrations/0002_tipo_encuesta.sql`**:
   - `ALTER TABLE public.respuestas_encuesta ADD COLUMN tipo_encuesta text;`
   - `ALTER TABLE public.respuestas_encuesta ADD CONSTRAINT chk_tipo_encuesta CHECK (tipo_encuesta IN ('compradores', 'vendedores', 'proveedores'));`
   - Sin `IF NOT EXISTS` — falla si ya aplicada.
2. **Modificar `api/encuesta.js`**: extraer `tipo_encuesta` del body, validarlo contra los 3 valores permitidos, incluirlo en el `JSON.stringify({ datos, tipo_encuesta })` hacia Supabase.
3. **Modificar `app.js`**: agregar `tipo_encuesta: 'compradores'` al payload del `fetch('/api/encuesta')`.
4. **Modificar `references/vendedores/api/encuesta.js`**: agregar `tipo_encuesta: 'vendedores'` al payload hacia Supabase.
5. **Aplicar la migración** en el SQL editor de Supabase (producción).
6. **Actualizar `AGENTS.md`**: documentar la columna `tipo_encuesta`, los valores permitidos, y el patrón para agregar nuevos tipos.
7. **Verificar**: hacer un POST de prueba y confirmar en Supabase que la columna se guarda con el valor correcto.

## Acceptance criteria

- [ ] Existe `supabase/migrations/0002_tipo_encuesta.sql` con `ADD COLUMN` y `CHECK` constraint.
- [ ] La migración se aplicó en producción: `\d respuestas_encuesta` muestra `tipo_encuesta text` y `chk_tipo_encuesta`.
- [ ] `api/encuesta.js` extrae y valida `tipo_encuesta` del body, lo pasa a Supabase.
- [ ] `app.js` envía `tipo_encuesta: 'compradores'` en el POST.
- [ ] `references/vendedores/api/encuesta.js` envía `tipo_encuesta: 'vendedores'`.
- [ ] POST sin `tipo_encuesta` o con valor inválido devuelve 400.
- [ ] Registros existentes en la tabla permanecen con `tipo_encuesta = NULL`.
- [ ] `AGENTS.md` documenta la columna, los valores, y el patrón para nuevos tipos.

## Decisions

- **Yes:** Columna nullable — los registros históricos quedan con `NULL` sin backfill. Simple, sin riesgo de corromper datos.
- **Yes:** CHECK constraint con 3 valores fijos — evita typos y garantiza consistencia.
- **Yes:** Frontend hardcodea el tipo — cada encuesta sabe cuál es; el endpoint lo valida.
- **Yes:** API valida `tipo_encuesta` — rechaza valores desconocidos (400).
- **No:** Backfill de registros existentes — no hay forma segura de inferir el tipo de respuestas históricas.
- **No:** IF NOT EXISTS — sigue la convención del proyecto de fallar en voz alta si la migración ya existe.

## Risks

| Risk | Mitigation |
|------|------------|
| La migración falla si ya se corrió | Seguir la convención: sin `IF NOT EXISTS` — el error indica que ya existe |
| API rechaza POSTs antiguos que no envían `tipo_encuesta` | El campo es nullable; la API acepta NULL y lo deja como NULL |
| Supabase tarda en propagar el cambio de schema | El check constraint se aplica inmediatamente; el INSERT falla si el valor no es válido |

## What is **not** in this spec

- Crear template/endpoint para `proveedores`.
- Dashboard con filtro por tipo.
- RLS policies basadas en `tipo_encuesta`.
- Cambios visuales en la encuesta.
