# SPEC 17 — Exportar resultados a CSV desde el dashboard

> **Status:** Implementado
> **Depends on:** SPEC 16
> **Date:** 2026-10-31
> **Objective:** Agregar botón de "Exportar CSV" al dashboard que descargue un archivo CSV con todas las respuestas filtradas por tipo de encuesta.

## Contexto

El dashboard ya muestra datos en gráficos y KPIs. El siguiente paso natural es permitir la exportación de datos crudos para análisis externo (Excel, Google Sheets, etc.).

## Scope

**In:**

- Agregar botón "Exportar CSV" en el header del dashboard.
- Descargar todas las respuestas con columnas: `id`, `tipo_encuesta`, `created_at`, `tiempo_total_segundos`.
- Incluir las respuestas de cada pregunta como columnas individuales (`p1`, `p2`, `p3`, ..., `_metadata`, `_geo`).
- El filtro del selector de tipo se respeta: si está en "compradores" solo exporta compradores, si "vendedores" solo vendedores, si "todas" exporta todo.
- Funcionalidad 100% cliente — sin endpoint serverless.
- Nombre del archivo: `respuestas_{tipo}_{fecha}.csv` (ej: `respuestas_vendedores_2026-10-31.csv`).

**Out of scope:**

- Filtro por rango de fechas.
- Exportar a Excel (.xlsx) — solo CSV por ahora.
- Paginación ni selección de columnas.

## Implementation plan

1. **Crear `dashboard/export.js`**:
   - Función `fetchResponses(tipo)` → carga todas las respuestas desde Supabase.
   - Función `flattenData(rows)` → convierte JSONB `datos` en columnas planas.
   - Función `toCSV(headers, rows)` → genera string CSV con escaping correcto.
   - Función `downloadCSV(content, filename)` → trigger de descarga.
   - Función `exportResponses(tipo)` → orquestador principal.

2. **Actualizar `dashboard/index.html`**:
   - Agregar botón "Exportar CSV" junto al selector de tipo.
   - Mostrar estado de carga ("Exportando...") mientras se procesa.

3. **Actualizar `dashboard/dashboard.js`**:
   - Conectar el botón con `exportResponses()`.
   - Respetar el filtro activo del selector.

4. **Actualizar `build.mjs`**:
   - Asegurar que `export.js` se copie a `dist/dashboard/` (ya lo hace por copiar todo el directorio).

5. **Actualizar `AGENTS.md`**:
   - Documentar la funcionalidad de exportación.

## Formato CSV

```csv
id,tipo_encuesta,created_at,tiempo_total_segundos,p1,p2,p3,...,_metadata.fuente,_geo.ip
20,vendedores,2026-10-31 17:42:25,103,"Productos físicos nuevos,Productos físicos usados","Alimentos y bebidas",...
21,compradores,2026-10-31 17:44:39,114,"Alimentos y bebidas,Ropa, calzado y accesorios",...
```

**Notas:**
- Las respuestas de checkbox (arrays) se unen con `;` para facilitar análisis en Excel.
- Los campos de `_metadata` y `_geo` se aplanan con notación punto.
- Las columnas vacías se dejan en blanco.

## Acceptance criteria

- [x] Botón "Exportar CSV" visible en el dashboard.
- [x] Al hacer clic, se descarga un archivo `.csv`.
- [x] El archivo contiene todas las respuestas del tipo seleccionado.
- [x] Las columnas incluyen: `id`, `tipo_encuesta`, `created_at`, `tiempo_total_segundos`, `p1`–`p39`/`p32`, `_metadata.*`, `_geo.*`.
- [x] Los arrays de checkbox se exportan separados por `;`.
- [x] El archivo se abre correctamente en Excel/Google Sheets sin errores de encoding.
- [x] El nombre del archivo incluye el tipo y la fecha.
- [x] Funciona con 0 registros (archivo vacío con headers).
- [x] `AGENTS.md` documenta la funcionalidad.

## Decisions

- **Yes:** Exportación 100% cliente — sin endpoint serverless, usa Supabase REST directo.
- **Yes:** CSV simple — no Excel (.xlsx) por ahora (requiere librería pesada).
- **Yes:** `;` como separador para arrays — más compatible con Excel en español (que usa `,` como decimal).
- **No:** Filtro por fechas — spec futuro si se necesita.
- **No:** Selección de columnas — exporta todo para máxima simplicidad.

## Risks

| Risk | Mitigation |
|------|------------|
| Muchos registros hacen lento el export | Cargar de a bloques si supera 1000 registros |
| Excel abre CSV con encoding incorrecto | Agregar BOM UTF-8 (`\uFEFF`) al inicio del archivo |
| Campos con comas o saltos de línea rompen el CSV | Escapar correctamente con comillas dobles (`"` → `""`) |
