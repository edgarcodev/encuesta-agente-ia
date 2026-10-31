# SPEC 10 — Extraer preguntas de cada encuesta a archivos de configuración JSON

> **Status:** Aprobado
> **Depends on:** SPEC 09
> **Date:** 2026-10-30
> **Objective:** Separar las preguntas de `app.js` en archivos JSON declarativos. `app.js` queda como motor puro: carga, interpreta condiciones, renderiza y envía.

## Scope

**In:**

- Crear `config/preguntas/compradores.json` (41 preguntas).
- Crear `config/preguntas/vendedores.json` (38 preguntas).
- Refactorizar `app.js` para cargar JSONs vía `fetch()` y armar `steps` dinámicamente.
- Formato declarativo para condiciones (`condition.field`, `condition.operator`, `condition.value`).
- Formato declarativo para opciones dinámicas (`dynamicDefinition`).
- Slot preparado para `proveedores.json` (sin contenido).
- `build.mjs` copia `config/preguntas/` a `dist/config/preguntas/`.
- **No** cambios en textos, opciones, orden, IDs, validaciones ni en el contrato de envío.

**Out of scope:**

- Cambios funcionales o de comportamiento.
- Nueva encuesta de proveedores.

## JSON format

### Basic question

```json
{
  "id": "p1",
  "question": "1. ¿Qué compras habitualmente? (puedes seleccionar varias)",
  "type": "checkbox",
  "options": ["Alimentos y bebidas", "Ropa, calzado y accesorios", "..."],
  "allowOther": true,
  "condition": { "always": true }
}
```

### Question with maxSelections / placeholder / hint

```json
{
  "id": "p5",
  "question": "5. ...",
  "type": "checkbox",
  "maxSelections": 4,
  "options": ["..."],
  "condition": { "always": true }
}
```

### Conditional visibility

```json
{
  "id": "p9_motivo",
  "question": "¿Qué te motivó...?",
  "type": "checkbox",
  "options": ["..."],
  "allowOther": true,
  "condition": {
    "field": "p9",
    "operator": "oneOf",
    "value": ["Sí, frecuentemente", "Sí, algunas veces", "Sí, una vez"]
  }
}
```

### Dynamic definition (question changes type/options based on another answer)

```json
{
  "id": "p22",
  "question": "22. ¿En qué localidad...?",
  "type": "radio",
  "condition": { "always": true },
  "dynamicDefinition": {
    "field": "p21",
    "when": { "operator": "equals", "value": "Perú" },
    "then": {
      "type": "radio",
      "hint": "Selecciona la zona donde compras habitualmente.",
      "options": ["Lima Metropolitana / Callao", "Arequipa", "...", "Otra:"],
      "allowOther": true
    },
    "else": {
      "type": "text",
      "hint": "Escribe el nombre de tu ciudad o localidad (fuera de Perú).",
      "placeholder": "Ej. Santiago, Bogotá, São Paulo, Madrid..."
    }
  }
}
```

### Complex conditions (AND)

```json
{
  "condition": {
    "logic": "and",
    "conditions": [
      { "field": "p21", "operator": "equals", "value": "Perú" },
      { "field": "p23", "operator": "oneOf", "value": ["En el mismo país donde realizo mis compras", "Mi actividad se desarrolla principalmente por Internet"] }
    ]
  }
}
```

### Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `always` | Always visible | `{ "always": true }` |
| `equals` | `answers[field] === value` | `p9`, `equals`, `"Sí, frecuentemente"` |
| `notEquals` | `answers[field] !== value` | `p23`, `notEquals`, `"Actualmente no..."` |
| `oneOf` | `value.includes(answers[field])` | `p9`, `oneOf`, `["Sí, frecuentemente", ...]` |
| `includes` | `answers[field].includes(value)` | — |
| `notIncludes` | `!answers[field].includes(value)` (for arrays) | `p13`, `notIncludes`, `"No he tenido..."` |

## File structure

```
config/
  preguntas/
    compradores.json     ← 41 preguntas
    vendedores.json      ← 38 preguntas
    .gitkeep
```

## Implementation plan

1. **Crear `config/preguntas/compradores.json`** con las 41 preguntas actuales (sin cambiar nada funcional).
2. **Crear `config/preguntas/vendedores.json`** con las 38 preguntas actuales.
3. **Refactorizar `app.js`**:
   - Eliminar `ENCUESTAS.compradores.steps[]` y `ENCUESTAS.vendedores.steps[]`.
   - Agregar `ENCUESTAS[tipo].questionsUrl` con la ruta al JSON.
   - En `init()`, después de validar el tipo, hacer `fetch(ENCUESTAS[tipo].questionsUrl)`.
   - Parsear JSON y convertir a formato interno con `parseQuestions()`.
4. **Crear motor de condiciones**:
   - `evaluateCondition(condition, answers)` → `boolean`.
   - `applyDynamicDefinition(step, answers)` → merged step definition.
   - `parseQuestions(rawQuestions)` → convierte JSON raw a steps con `condition()` y `getDefinition()`.
5. **Build**: agregar copia de `config/preguntas/` → `dist/config/preguntas/` en `build.mjs`.
6. **Actualizar `AGENTS.md`** con la estructura y formato JSON.

## Acceptance criteria

- [ ] `config/preguntas/compradores.json` existe con 41 preguntas idénticas a las actuales.
- [ ] `config/preguntas/vendedores.json` existe con 38 preguntas idénticas a las actuales.
- [ ] `app.js` no contiene `steps.push()` ni preguntas hardcodeadas.
- [ ] `app.js` contiene motor `evaluateCondition()`, `applyDynamicDefinition()`, `parseQuestions()`.
- [ ] `build.mjs` copia `config/preguntas/` a `dist/`.
- [ ] Comportamiento idéntico: mismas preguntas, mismo orden, mismas condiciones, mismo envío.
- [ ] `/?tipo=compradores` y `/?tipo=vendedores` funcionan igual que antes.
- [ ] `AGENTS.md` documenta el formato JSON.

## Decisions

- **Yes:** JSON puro sin `eval()` ni funciones serializadas.
- **Yes:** Formato declarativo con `condition.*` y `dynamicDefinition.*`.
- **Yes:** Condiciones se evalúan en JS (`evaluateCondition`).
- **Yes:** Build copia los JSONs a `dist/`.
- **No:** Cambios funcionales — solo migración estructural.

## Risks

| Risk | Mitigation |
|------|------------|
| `fetch()` falla en dev (CORS/file://) | Los JSON van en `dist/` y se sirven desde el mismo origin |
| JSON malformado rompe la encuesta | Validar con `node -e` antes de commitear; el build puede validar |
| `build.mjs` no copia los JSON | Agregar regla explícita de copia |
