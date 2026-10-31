# SPEC 16 — Dashboard privado con selector de encuesta y gráficos básicos

> **Status:** Borrador
> **Depends on:** SPEC 13, SPEC 15
> **Date:** 2026-10-31
> **Objective:** Construir el dashboard administrativo con autenticación, selector de tipo de encuesta, y gráficos básicos con datos reales de Supabase.

## Contexto

El dashboard existe como placeholder desde SPEC 12. Con SPEC 13 ya hay autenticación y con SPEC 15 ya hay RLS configurado para permitir SELECT a usuarios autenticados. Ahora es momento de construir la interfaz visual con datos reales.

## Scope

**In:**

- Reemplazar `dashboard/index.html` con layout completo (header, sidebar, gráficos).
- Crear `dashboard/charts.js` con configuración de Chart.js.
- Actualizar `dashboard/dashboard.js` para cargar datos de Supabase y renderizar gráficos.
- Selector de tipo de encuesta: compradores, vendedores, todos.
- KPIs: total respuestas, respuestas hoy, tiempo promedio.
- Gráficos: barras por tipo, línea por día, donut pregunta clave.
- Instalar Chart.js vía CDN en `dashboard/index.html`.
- Actualizar `AGENTS.md` con documentación del dashboard.

**Out of scope:**

- Filtros por fecha (rango personalizado).
- Exportación a CSV.
- Paginación ni búsqueda.
- Gráficos avanzados (tendencias, comparativas).

## Arquitectura

```
dashboard/
├── index.html          ← Layout: header, sidebar, chart containers
├── dashboard.js        ← Auth check + carga de datos + orquestación
├── charts.js           ← Configuración de Chart.js (instancias, updates)
└── config.js           ← SUPABASE_URL / SUPABASE_ANON_KEY (inyectados por build)
```

## Queries

```sql
-- Total por tipo
select tipo_encuesta, count(*) from respuestas_encuesta
  where tipo_encuesta is not null
  group by tipo_encuesta;

-- Por día (últimos 30 días)
select date(created_at) as day, count(*)
  from respuestas_encuesta
  where created_at >= now() - interval '30 days'
  group by day order by day;

-- Total general
select count(*) from respuestas_encuesta;

-- Respuestas hoy
select count(*) from respuestas_encuesta
  where date(created_at) = current_date;

-- Respuestas a pregunta clave (p1 - qué compran/venden)
select datos->>'p1' as respuesta, count(*)
  from respuestas_encuesta
  where tipo_encuesta = 'compradores'
  group by respuesta limit 10;
```

## Componentes del dashboard

1. **Header**: Logo, email del usuario, botón de logout.
2. **Selector de encuesta**: Dropdown (compradores, vendedores, todos).
3. **KPIs** (tarjetas):
   - Total de respuestas
   - Respuestas hoy
   - Tiempo promedio de respuesta
4. **Gráficos**:
   - Barras: Respuestas por tipo de encuesta
   - Línea: Respuestas por día (últimos 30 días)
   - Donut: Distribución de p1 (qué compran/venden)

## Implementation plan

1. **Actualizar `dashboard/index.html`**:
   - Layout con header, sidebar con selector, contenedores de gráficos.
   - Incluir Chart.js CDN.
   - Referencias a `dashboard.js` y `charts.js`.

2. **Crear `dashboard/charts.js`**:
   - Inicializar Chart.js instances (barras, línea, donut).
   - Función `updateCharts(data)` para refrescar datos.

3. **Actualizar `dashboard/dashboard.js`**:
   - Verificar sesión (ya existente).
   - Cargar datos de Supabase con queries REST.
   - Llamar `updateCharts()` con los datos.
   - Escuchar cambios en el selector → recargar datos.

4. **Actualizar `build.mjs`** para copiar `charts.js` a `dist/dashboard/`.

5. **Actualizar `AGENTS.md`** con documentación del dashboard.

## Acceptance criteria

- [ ] Dashboard se carga después del login con datos reales.
- [ ] Selector de tipo de encuesta filtra los gráficos.
- [ ] Al menos 3 gráficos funcionales: barras, línea, donut.
- [ ] KPIs muestran totales correctos (total, hoy, promedio).
- [ ] Diseño responsive (mobile-friendly).
- [ ] Datos se refrescan al cambiar el selector.
- [ ] `AGENTS.md` documenta la estructura del dashboard.

## Decisions

- **Yes:** Chart.js vía CDN — simple, no requiere build step.
- **Yes:** Datos se cargan con `SUPABASE_ANON_KEY` + sesión auth (RLS permite SELECT).
- **Yes:** Selector con 3 opciones: compradores, vendedores, todos.
- **No:** Filtros por fecha — spec futuro.
- **No:** Exportación CSV — SPEC 17.
- **No:** Paginación — los datos caben en queries simples por ahora.

## Risks

| Risk | Mitigation |
|------|------------|
| Muchos datos hacen lento el dashboard | Limitar a últimos 30 días, agregar índices si necesario |
| Chart.js CDN falla | Incluir fallback o mensaje de error |
| RLS bloquea queries del dashboard | Ya verificado en SPEC 15 — `authenticated` puede SELECT |
| `datos` JSONB es complejo de parsear | Usar PostgREST con `select=id,datos,tipo_encuesta,created_at` y parsear en JS |
