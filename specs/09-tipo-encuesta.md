# SPEC 09 — Parámetro de ruta `?tipo=` para cargar el cuestionario correspondiente

> **Status:** Implementado
> **Depends on:** SPEC 08
> **Date:** 2026-10-30
> **Objective:** Permitir que una sola encuesta (`/`) cargue el cuestionario correcto según el parámetro `?tipo=` (`compradores`, `vendedores`, `proveedores`), con preguntas distintas para cada tipo.

## Scope

**In:**

- `app.js` lee `?tipo=` de la URL; si no existe, usa `compradores`.
- Cada tipo tiene su propio set de preguntas embebido en `app.js` (estructura extensible para futuros tipos).
- `tipo_encuesta` se infiere del parámetro y se envía al POST.
- Tipo inválido → muestra mensaje amigable "Tipo de encuesta no disponible".
- El splash screen, geolocalización, rate limiting y todas las funciones existentes se mantienen.
- Título del `<h1>` cambia según el tipo (ej. "Mega Remates · Compradores" vs "Mega Remates · Vendedores").
- Colores de progreso: compradores = azul, vendedores = naranja.
- `api/encuesta.js` ya valida `tipo_encuesta` (SPEC 08) — no requiere cambios adicionales.

**Out of scope (for future specs):**

- Extraer preguntas a archivos JSON externos (SPEC 10).
- Encuesta de `proveedores` — no existe aún el template, pero el slot queda preparado.
- `api/encuesta-vendedores` — las respuestas de vendedores van a la misma tabla con `tipo_encuesta: 'vendedores'`.

## Data model

No cambia. Usa `tipo_encuesta` ya creado en SPEC 08.

## Architecture

```javascript
const ENCUESTAS = {
  compradores: {
    tipo: 'compradores',
    titulo: 'Mega Remates · Compradores',
    color: '#3b82f6',
    STORAGE_KEY: 'megaremates_encuesta_enviada',
    NONCE_KEY: null,            // nonce fijo
    steps: [ ... 39 preguntas ... ]
  },
  vendedores: {
    tipo: 'vendedores',
    titulo: 'Mega Remates · Vendedores',
    color: '#f97316',
    STORAGE_KEY: 'megaremates_encuesta_vendedores_enviada',
    NONCE_KEY: 'encuesta_nonce_vendedores',  // nonce en sessionStorage
    steps: [ ... 32 preguntas ... ]
  }
};
```

## Implementation plan

1. **Extraer preguntas de compradores** — mover el bloque `steps.push(...)` actual a un objeto dentro de `ENCUESTAS.compradores.steps`.
2. **Incluir preguntas de vendedores** — trasladar de `references/vendedores/index.html` a `ENCUESTAS.vendedores.steps`.
3. **Refactorizar `app.js`** — usar `ENCUESTAS[tipoActivo]` para:
   - `titulo` → actualiza `<h1>`
   - `color` → actualiza gradiente de progress bar
   - `STORAGE_KEY` → localStorage check de "ya enviada"
   - `steps` → renderizado de preguntas
   - `tipo_encuesta` → payload del POST
   - Endpoint: vendedores usa `/api/encuesta-vendedores` si existe, compradores `/api/encuesta`
4. **Leer `?tipo=` en `init()`** — `new URLSearchParams(window.location.search).get('tipo')`.
5. **Validar tipo** — si no está en `ENCUESTAS`, mostrar mensaje de error.
6. **Splash screen** — debe adaptarse al tipo (título dinámico).
7. **Actualizar `AGENTS.md`** — documentar la arquitectura de ENCUESTAS y el patrón para agregar nuevos tipos.

## Acceptance criteria

- [x] `app.js` contiene objeto `ENCUESTAS` con `compradores` y `vendedores`.
- [x] `/?tipo=compradores` carga las 39 preguntas de compradores con `tipo_encuesta: 'compradores'`.
- [x] `/?tipo=vendedores` carga las 32 preguntas de vendedores con `tipo_encuesta: 'vendedores'`.
- [x] Sin parámetro → default `compradores`.
- [x] `/?tipo=invalido` muestra "Tipo de encuesta no disponible".
- [x] El splash screen muestra el título correcto según el tipo.
- [x] El color del progress bar cambia según el tipo (azul compradores, naranja vendedores).
- [x] LocalStorage usa claves separadas por tipo para "ya enviada".
- [x] Las respuestas se guardan con el `tipo_encuesta` correcto en Supabase.
- [x] `AGENTS.md` documenta la estructura `ENCUESTAS` y el patrón para nuevos tipos.

## Decisions

- **Yes:** Preguntas embebidas en `app.js` — hasta que SPEC 10 las extraiga a JSON.
- **Yes:** Un solo `app.js` con todos los tipos — simple, sin routing server-side.
- **Yes:** Endpoint separado para vendedores si existe `/api/encuesta-vendedores` — de lo contrario, usar el mismo con `tipo_encuesta`.
- **No:** Cambios en la API — ya valida `tipo_encuesta` del SPEC 08.

## Risks

| Risk | Mitigation |
|------|------------|
| `app.js` crece mucho con dos sets de preguntas | Temporal — SPEC 10 extraerá a JSON |
| Preguntas de vendedores inline en HTML vs estructuradas en `app.js` | Reescribir en formato `steps.push()` compatible con la lógica existente |
| Conflicto de STORAGE_KEY entre tipos | Cada tipo tiene su propia clave |
