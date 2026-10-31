# SPEC 11 — Estandarizar `references/vendedores/` como plantilla para nuevas encuestas

> **Status:** Borrador
> **Depends on:** SPEC 08, SPEC 10
> **Date:** 2026-10-30
> **Objective:** Asegurar que `references/vendedores/` sea una plantilla actualizada y documentada para crear nuevas encuestas independientes (proveedores, etc.), con la misma funcionalidad que la encuesta principal.

## Contexto

El proyecto tiene dos patrones de encuestas:

1. **Encuesta principal** (`/`) — un solo `app.js` que carga preguntas de `config/preguntas/*.json` según `?tipo=`.
2. **Encuestas independientes** (`references/<tipo>/`) — cada una con su propio `index.html`, `api/encuesta.js` y `vercel.json`, para despliegue separado (otro dominio, otro proyecto Vercel).

`references/vendedores/` existe pero no está actualizado con:
- Campo `tipo_encuesta` en el POST (SPEC 08)
- Pantalla splash de bienvenida
- Consistencia con la arquitectura actual

## Scope

**In:**

- Actualizar `references/vendedores/api/encuesta.js` para incluir `tipo_encuesta: 'vendedores'` en el POST.
- Actualizar `references/vendedores/index.html` para incluir:
  - Pantalla splash de bienvenida (igual que la encuesta principal).
  - Mismos textos, opciones y preguntas que `config/preguntas/vendedores.json` (sin cambios funcionales).
- Crear `references/vendedores/README.md` explicando cómo usar la plantilla para crear nuevas encuestas.
- Crear `references/.gitkeep` para que el directorio exista en git (aunque `references/` está en `.gitignore`, la carpeta `references/vendedores/` sí debe estar versionada).

**Out of scope:**

- Crear encuesta de `proveedores` (solo la plantilla).
- Cambios en la encuesta principal (`app.js`, `config/`).
- Cambios en `api/encuesta.js` principal (ya valida `tipo_encuesta`).

## Architecture de una encuesta independiente

```
references/<tipo>/
  index.html         ← HTML + CSS + JS inline (como vendedores actual)
  api/
    encuesta.js      ← Serverless function con tipo_encuesta hardcodeado
  vercel.json        ← Rewrites para servir index.html + ejecutar /api/encuesta
  README.md          ← Instrucciones para duplicar esta plantilla
```

## Implementation plan

1. **Actualizar `references/vendedores/api/encuesta.js`**:
   - Extraer `tipo_encuesta` del body (si viene del frontend) o hardcodear `'vendedores'`.
   - Incluir `tipo_encuesta` en el POST a Supabase.

2. **Actualizar `references/vendedores/index.html`**:
   - Agregar splash screen con logo y botón "Comenzar encuesta".
   - Verificar que las 38 preguntas coincidan con `config/preguntas/vendedores.json`.
   - Incluir `tipo_encuesta: 'vendedores'` en el fetch POST.
   - Mismos estilos CSS que la encuesta principal (colores naranja).

3. **Crear `references/vendedores/README.md`** con:
   - Cómo duplicar esta plantilla para un nuevo tipo (ej. `proveedores`).
   - Qué archivos cambiar y dónde.
   - Variables de entorno necesarias.

4. **Verificar** que el build y la estructura sean consistentes.

## Acceptance criteria

- [ ] `references/vendedores/api/encuesta.js` incluye `tipo_encuesta: 'vendedores'` en el POST.
- [ ] `references/vendedores/index.html` tiene splash screen con logo MegaRemates.
- [ ] Las 38 preguntas de `references/vendedores/index.html` coinciden con `config/preguntas/vendedores.json`.
- [ ] El POST incluye `tipo_encuesta: 'vendedores'` y guarda correctamente en Supabase.
- [ ] `references/vendedores/README.md` existe con instrucciones claras para crear nuevas encuestas.
- [ ] `vercel.json` tiene el rewrite correcto para `/api/encuesta`.

## Decisions

- **Yes:** `references/vendedores/` se mantiene como plantilla standalone (no comparte código con la encuesta principal).
- **Yes:** Las preguntas se mantienen inline en `index.html` (no usa JSON externo) — es una plantilla independiente.
- **Yes:** Cada encuesta independiente tiene su propio `api/encuesta.js` con su `tipo_encuesta`.
- **No:** Refactorizar `references/` para usar `config/preguntas/` — son patrones distintos (standalone vs centralizada).

## Risks

| Risk | Mitigation |
|------|------------|
| Duplicación de preguntas entre `index.html` y `config/preguntas/` | Documentar que son independientes; SPEC 10 ya centralizó la principal |
| Olvidar actualizar `references/` al cambiar preguntas | No es obligatorio — son patrones distintos |
