# SPEC 25 — Guardar borrador en `localStorage` para retomar encuesta

> **Status:** Aprobado
> **Depends on:** SPEC 23
> **Date:** 2026-11-02
> **Objective:** Guardar respuestas y progreso de la encuesta en `localStorage` para que el usuario pueda retomar donde lo dejó si cierra o recarga la página.

## Contexto

Si el usuario cierra el navegador, pierde conexión o recarga accidentalmente la página, pierde todo el progreso de la encuesta. Esto genera frustración y abandono. El spec agrega persistencia local del borrador.

## Scope

**In:**

- **Guardar borrador** en `localStorage` después de cada respuesta y antes de cerrar la página (`beforeunload`).
- **Restaurar borrador** al iniciar la encuesta: si existe un borrador no enviado, mostrar prompt "¿Continuar encuesta anterior?" (Sí / No).
- **Limpiar borrador** al enviar exitosamente la encuesta.
- **Borrador separado por tipo** (`compradores`, `vendedores`).
- **Datos guardados**: `answers` (respuestas), `currentStepIndex` (paso actual), `timestamps` (tiempos por pregunta).
- **Pruebas unitarias** para las funciones de guardar/restaurar borrador.
- **Pruebas E2E** que validen: cerrar navegador → recargar → restaurar borrador.

**Out of scope (para futuros specs):**

- Borrador en servidor (sync entre dispositivos).
- Borrador con expiración (borrar borradores antiguos).
- Encriptación del borrador (los datos son anónimos, no es crítico).

## Data model

```js
// Key: megaremates_encuesta_borrador_{tipo}
// Ej: megaremates_encuesta_borrador_compradores
{
  answers: {
    p1: ["Alimentos y bebidas", "Ropa, calzado y accesorios"],
    p2: "Varias veces por semana",
    p3: ["Tiendas físicas", "Facebook"],
    // ...
  },
  currentStepIndex: 5,
  tiemposPorPregunta: { p1: 8, p2: 3, p3: 12 },
  inicioEncuesta: "2026-11-02T10:30:00.000Z",
  savedAt: "2026-11-02T10:35:00.000Z"
}
```

## Implementation plan

1. **Crear `lib/draft.js`** con funciones puras:
   - `getDraftKey(tipo)` → `'megaremates_encuesta_borrador_' + tipo`
   - `saveDraft(answers, currentStepIndex, tiemposPorPregunta, inicioEncuesta, storageKey)` → escribe en `localStorage`
   - `loadDraft(storageKey)` → lee de `localStorage` y retorna objeto o `null`
   - `clearDraft(storageKey)` → borra de `localStorage`

2. **Integrar guardado en `app.js`**:
   - Llamar `saveDraft()` después de `saveCurrentAnswer()` en `renderStep()`.
   - Agregar listener `window.addEventListener('beforeunload', ...)` que llame `saveDraft()`.

3. **Integrar restauración en `app.js`**:
   - En `startSurvey()`, antes de `renderStep()`, verificar si existe borrador.
   - Si existe, mostrar modal/prompt: "Tienes una encuesta guardada. ¿Deseas continuar?"
   - Si "Sí": cargar `answers`, `currentStepIndex`, `tiemposPorPregunta`, `inicioEncuesta` desde el borrador.
   - Si "No": borrar borrador con `clearDraft()` e iniciar encuesta limpia.

4. **Limpiar borrador al enviar**:
   - En `enviarRespuestas()`, si el envío es exitoso, llamar `clearDraft()`.

5. **Pruebas unitarias** (`tests/unit/draft.test.js`):
   - `saveDraft()` escribe correctamente en `localStorage`.
   - `loadDraft()` retorna los datos guardados.
   - `loadDraft()` retorna `null` si no hay borrador.
   - `clearDraft()` borra la key de `localStorage`.
   - `getDraftKey()` genera la key correcta por tipo.
   - Separación por tipo: borrador de compradores no interfiere con vendedores.

6. **Pruebas E2E** (`tests/e2e/draft.spec.js`):
   - Llenar 3 pasos → recargar página → aparece prompt de restaurar → aceptar → respuestas restauradas.
   - Llenar 3 pasos → recargar → rechazar restaurar → encuesta empieza limpia.
   - Completar encuesta → recargar → no aparece prompt (borrador fue limpiado).
   - Cambiar de tipo de encuesta → borrador del otro tipo no se muestra.

## Acceptance criteria

- [ ] `saveDraft()` guarda `answers`, `currentStepIndex`, `tiemposPorPregunta` en `localStorage`.
- [ ] `loadDraft()` retorna los datos guardados o `null` si no hay borrador.
- [ ] `clearDraft()` elimina el borrador de `localStorage`.
- [ ] Borrador se guarda después de cada respuesta.
- [ ] Borrador se guarda al cerrar/recargar la página (`beforeunload`).
- [ ] Al iniciar, si existe borrador, se muestra prompt "¿Continuar encuesta anterior?".
- [ ] Si el usuario acepta, se restauran respuestas y paso actual.
- [ ] Si el usuario rechaza, se borra borrador y empieza encuesta limpia.
- [ ] Al enviar exitosamente, el borrador se elimina.
- [ ] Borrador separado por tipo (compradores vs vendedores).
- [ ] E2E: cerrar y recargar restaura borrador correctamente.
- [ ] E2E: después de enviar, no se muestra prompt de restaurar.
- [ ] Unit tests para `lib/draft.js` (guardar, cargar, limpiar, separación por tipo).

## Decisions

- **Yes:** `localStorage` — suficiente para datos anónimos, no necesita sync entre dispositivos.
- **Yes:** Prompt de restauración — el usuario decide si retoma o empieza de nuevo.
- **Yes:** Borrador por tipo — compradores y vendedores son encuestas diferentes.
- **Yes:** Incluir `tiemposPorPregunta` e `inicioEncuesta` — para que el tiempo total sea preciso.
- **No:** Encriptación — las respuestas son anónimas, no hay datos sensibles.
- **No:** Expiración automática — el borrador se limpia al enviar; si el usuario nunca termina, no ocupa espacio significativo.

## Risks

| Risk | Mitigation |
|------|------------|
| `localStorage` lleno o deshabilitado | `try/catch` en `saveDraft()` — si falla, continuar sin borrador |
| Borrador corrupto (JSON inválido) | `loadDraft()` valida JSON — si falla, retorna `null` y limpia |
| Usuario abandona encuesta y borrador queda "huérfano" | No es crítico — ocupa pocos KB, se sobrescribe al iniciar nueva encuesta |
| Datos del borrador desincronizados con versión de preguntas | Si las preguntas cambian entre sesiones, el motor de condiciones filtra pasos inexistentes automáticamente |

## What is **not** in this spec

- Borrador sincronizado en servidor (multi-dispositivo).
- Expiración automática de borradores antiguos.
- Encriptación del borrador.
- Soporte para encuestas incompletas en el dashboard.
