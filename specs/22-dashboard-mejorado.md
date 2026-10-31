# SPEC 22 — Dashboard mejorado con filtros y tabla de respuestas

> **Status:** Implementado
> **Depends on:** SPEC 17
> **Date:** 2026-10-31
> **Objective:** Mejorar el dashboard con filtro por rango de fechas, tabla de respuestas crudas, y gráficos adicionales (fuente, dispositivo). Actualizar `AGENTS.md` con toda la documentación acumulada.

## Contexto

El dashboard actual muestra KPIs, 3 gráficos básicos y export CSV. Para análisis más profundo se necesita filtrar por fechas, ver respuestas individuales, y entender de dónde vienen los usuarios.

## Scope

**In:**

- **Filtro por rango de fechas**: selector rápido (7d, 30d, 90d, todo) + fechas personalizadas.
- **Tabla de respuestas crudas**: ver respuestas individuales paginadas con columnas: ID, tipo, fecha, tiempo, respuestas resumidas.
- **Gráfico por fuente**: de dónde vienen los usuarios (Facebook, WhatsApp, Google, directo...).
- **Gráfico por dispositivo**: distribución celular/desktop/tablet.
- **Actualizar `AGENTS.md`** con toda la documentación acumulada del proyecto.

**Out of scope:**

- Comparativa de períodos.
- Filtros por pregunta específica.
- Export individual de respuestas.

## Implementation plan

1. **Actualizar `dashboard/index.html`**:
   - Agregar sección de filtros (rango de fechas, tipo).
   - Agregar pestañas/tabs: "Gráficos" | "Respuestas".
   - Tabla paginada para respuestas crudas.
   - Nuevos contenedores de gráficos (fuente, dispositivo).

2. **Actualizar `dashboard/charts.js`**:
   - Agregar configuraciones para gráfico de fuente (bar horizontal) y dispositivo (donut).

3. **Actualizar `dashboard/dashboard.js`**:
   - Agregar lógica de filtrado por fechas.
   - Cargar datos con `created_at >= fechaDesde AND created_at <= fechaHasta`.
   - Renderizar tabla de respuestas paginada (10-20 por página).
   - Parsear `_metadata.fuente` y `_metadata.dispositivo` para nuevos gráficos.

4. **Actualizar `dashboard/export.js`**:
   - Respetar los filtros activos (tipo + fechas) al exportar CSV.

5. **Actualizar `styles.css`**:
   - Estilos para filtros, tabs, tabla paginada.

6. **Actualizar `AGENTS.md`** con:
   - Documentación completa del dashboard (todas las features).
   - Rutas, auth, RLS, export, privacidad.
   - Estructura de archivos actualizada.

## Acceptance criteria

- [x] Filtro por rango de fechas visible y funcional (7d, 30d, 90d, todo, personalizado).
- [x] Todos los gráficos se actualizan al cambiar el filtro de fechas.
- [x] Tabla de respuestas crudas paginada con columnas relevantes.
- [x] Gráfico por fuente muestra distribución de canales (Facebook, WhatsApp, etc.).
- [x] Gráfico por dispositivo muestra distribución (celular, desktop, tablet).
- [x] Export CSV respeta los filtros activos.
- [x] Diseño responsive en mobile.
- [x] `AGENTS.md` documenta todo el proyecto actualizado.

## Decisions

- **Yes:** Paginación de 20 respuestas por página — balance entre performance y legibilidad.
- **Yes:** Filtros se aplican a todo (KPIs, gráficos, tabla, export).
- **Yes:** Pestañas "Gráficos" | "Respuestas" — interfaz limpia sin scroll infinito.
- **No:** Comparativa de períodos — spec futuro si se necesita.

## Risks

| Risk | Mitigation |
|------|------------|
| Muchos registros hacen lenta la tabla | Paginación + limit en query a Supabase |
| Filtro de fechas no funciona con timezone | Usar `created_at` directamente de Supabase (UTC) |
| UI se sobrecarga con tantas features | Tabs para separar gráficos de tabla |
