# SPEC 19 — Aviso de privacidad y casilla de consentimiento explícito

> **Status:** Implementado
> **Depends on:** SPEC 16
> **Date:** 2026-10-31
> **Objective:** Agregar casilla de consentimiento (marcada por defecto) en la página de resumen, antes de confirmar el envío. Si el usuario la desmarca, solo se envían las respuestas (anonimizado). Si la mantiene marcada, se envían también datos de navegación.

## Contexto

La encuesta recolecta datos adicionales más allá de las respuestas: geolocalización (`ipapi.co`), dispositivo, navegador, conexión, tiempos. El usuario debe poder optar por no compartir estos datos extras mientras aún puede enviar sus respuestas de forma anónima.

## Flujo del usuario

```
Splash → Preguntas → Resumen (con checkbox) → Confirmar → Envío a API
```

### Página de resumen (donde va el checkbox)

```
┌───────────────────────────────────────────────┐
│  ✅ Revisa tus respuestas antes de enviar     │
│                                               │
│  1. ¿Qué compras habitualmente?               │
│  Alimentos y bebidas, Ropa, calzado...        │
│                                               │
│  2. ¿Con qué frecuencia realizas compras?     │
│  Varias veces por semana                      │
│                                               │
│  ...                                          │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ ☑ Permitir datos de navegación          │  │
│  │   (ubicación aproximada, dispositivo)   │  │
│  │   [Aviso de privacidad]                 │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  [← Volver para editar]   [Confirmar y enviar ✓] │
└───────────────────────────────────────────────┘
```

### Comportamiento del checkbox

| Estado | Qué se envía a la API |
|--------|----------------------|
| **Marcado** (default) | `datos` + `tipo_encuesta` + `_metadata` completo + `_geo` |
| **Desmarcado** | Solo `datos` + `tipo_encuesta` + `tiempo_total_segundos` |

**El usuario siempre puede enviar la encuesta** — nunca se bloquea el envío.

## Scope

**In:**

- Checkbox **marcado por defecto** en la página de resumen (donde se muestran todas las respuestas).
- Texto discreto: *"Permitir datos de navegación (ubicación aproximada, dispositivo)"*.
- Si está **marcado** (default): se envía todo (respuestas + `_metadata` + `_geo`).
- Si está **desmarcado**: solo se envían las respuestas + `tipo_encuesta` + `tiempo_total_segundos`.
- Link discreto al aviso de privacidad junto al checkbox.
- Texto del aviso de privacidad hardcodeado en `app.js`.
- Sin cambios en la API — el cambio es solo en el frontend.

**Out of scope:**

- Panel de administración para gestionar avisos de privacidad.
- Registro de quién aceptó o no el consentimiento.
- Bloqueo del envío si no se acepta.

## Implementation plan

1. **Actualizar `app.js`**:
   - Agregar variable `allowMetadata = true` (default).
   - Modificar `showSummary()` para incluir el checkbox de privacidad antes de enviar.
   - Cambiar `enviarRespuestas()` para recibir el parámetro `allowMetadata`:
     - Si `true`: envía todo (respuestas + `_metadata` completo + `_geo`).
     - Si `false`: envía solo `datos` (respuestas) + `tipo_encuesta` + `tiempo_total_segundos`.
   - Agregar texto/modal para el aviso de privacidad.

2. **Flujo del resumen actualizado**:
   - `showSummary()` ya no envía automáticamente — muestra el resumen con checkbox + botón "Confirmar y enviar".
   - Botón "← Volver para editar" regresa a la última pregunta.
   - Al confirmar, se llama `enviarRespuestas(geo, allowMetadata)`.

3. **Sin cambios en `api/encuesta.js`**:
   - La API ya maneja campos opcionales — si no llegan `_metadata` o `_geo`, simplemente no se guardan.

4. **Aplicar a ambas encuestas** (compradores y vendedores) — compartido en `app.js`.

## Acceptance criteria

- [x] Checkbox visible en la página de resumen, marcado por defecto.
- [x] Si está marcado: se envía todo como antes (respuestas + metadata + geo).
- [x] Si está desmarcado: solo se envían respuestas + `tipo_encuesta` + `tiempo_total_segundos`.
- [x] El usuario siempre puede enviar la encuesta (no se bloquea).
- [x] Link al aviso de privacidad visible junto al checkbox.
- [x] Aviso de privacidad con texto claro y conciso.
- [x] Funciona en ambas encuestas (compradores y vendedores).
- [x] `AGENTS.md` documenta el comportamiento.

## Decisions

- **Yes:** Checkbox marcado por defecto — maximiza datos recolectados mientras da opción de opt-out.
- **Yes:** Siempre se puede enviar — sin bloqueo, las respuestas son anónimas.
- **Yes:** Solo respuestas sin metadatos si se desmarca — anonimización real.
- **No:** Bloqueo del envío — no queremos perder respuestas.
- **No:** Registro de consentimiento — para un MVP, el checkbox es suficiente.

## Risks

| Risk | Mitigation |
|------|------------|
| Usuario desmarca sin entender | Texto claro y aviso de privacidad accesible |
| Legalmente insuficiente en algunas jurisdicciones | Consultar abogado si se escala a producción formal |
| Dificultad técnica para separar metadata | El cambio es solo en `enviarRespuestas()` — simple condicional |
