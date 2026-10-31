# SPEC 12 — Landing page en `/` y arquitectura para rutas separadas

> **Status:** Implementado
> **Depends on:** SPEC 10, SPEC 11
> **Date:** 2026-10-30
> **Objective:** Cambiar el comportamiento de `/` para mostrar una landing page en lugar de cargar la encuesta de compradores por defecto. Las encuestas solo se cargan con `?tipo=` explícito. Preparar estructura para `/login` y `/dashboard` futuros.

## Contexto

Actualmente `/?` sin parámetro carga la encuesta de compradores por defecto (`|| 'compradores'`). Esto impide usar `/` como landing page pública para publicidad, información del negocio, etc.

## Scope

**In:**

- Eliminar `|| 'compradores'` default en `app.js`.
- Sin `?tipo=` → mostrar landing page en `#dynamicArea`.
- `?tipo=compradores|vendedores` → splash → encuesta correspondiente (comportamiento actual).
- `?tipo=proveedores` → mensaje "Tipo de encuesta no disponible" (slot preparado).
- `?tipo=invalido` → mensaje de error con tipos válidos.
- Preparar estructura de carpetas para `/login` y `/dashboard` (archivos placeholder).
- Actualizar `AGENTS.md` con la nueva arquitectura de rutas y convención para agregar encuestas.
- Actualizar `vercel.json` si es necesario para las nuevas rutas.

**Out of scope:**

- Implementar login ni dashboard (Fase 3, SPECs 13-18).
- Cambios en preguntas, respuestas, validaciones o contratos de envío.
- Cambios en `references/` (encuestas independientes).

## Rutas objetivo

| URL | Comportamiento |
|-----|---------------|
| `/` | Landing page pública (placeholder hasta que se defina contenido) |
| `/?tipo=compradores` | Splash → Encuesta compradores (41 preguntas) |
| `/?tipo=vendedores` | Splash → Encuesta vendedores (38 preguntas) |
| `/?tipo=proveedores` | Mensaje "Encuesta no disponible aún" |
| `/?tipo=<inválido>` | Mensaje de error con tipos válidos |
| `/login` | *(Fase 3)* Página de autenticación con Supabase Auth |
| `/dashboard` | *(Fase 3)* Dashboard protegido con sesión válida |
| `/dashboard?tipo=compradores\|vendedores\|proveedores` | *(Fase 3)* Dashboard filtrado por tipo |

## Estructura de archivos (futuro)

```
/
├── index.html           ← Landing page + encuesta (controlado por JS)
├── styles.css           ← Estilos compartidos + landing
├── app.js               ← Motor de encuestas
├── config/
│   └── preguntas/
│       ├── compradores.json
│       ├── vendedores.json
│       └── .gitkeep
├── login/
│   ├── index.html       ← (Fase 3) Página de login
│   ├── styles.css       ← Estilos de login
│   └── auth.js          ← Lógica de Supabase Auth
├── dashboard/
│   ├── index.html       ← (Fase 3) Dashboard
│   ├── styles.css       ← Estilos del dashboard
│   └── dashboard.js     ← Lógica del dashboard
├── api/
│   └── encuesta.js      ← Serverless function
└── vercel.json          ← Rewrites para todas las rutas
```

## Implementation plan

1. **Modificar `app.js`**:
   - Eliminar `|| 'compradores'` en la lectura de `?tipo=`.
   - Si no hay `tipo`, llamar a `showLanding()` en vez de cargar encuesta.
   - Si `tipo` válido → comportamiento actual (splash → encuesta).
   - Si `tipo` inválido → mensaje de error actualizado.

2. **Crear `showLanding()`** en `app.js`:
   - Mostrar contenido de landing page en `#dynamicArea`.
   - Incluir links a `?tipo=compradores`, `?tipo=vendedores`.
   - Placeholder para contenido futuro de publicidad/info.

3. **Actualizar `index.html`**:
   - Ajustar splash screen para que no se muestre si no hay `?tipo=`.
   - Asegurar que el contenedor `#app` sea visible por defecto para la landing.

4. **Actualizar `vercel.json`**:
   - Asegurar que `/login/*` y `/dashboard/*` no sean interceptados por el catch-all.
   - Preparar rewrites para las carpetas `login/` y `dashboard/`.

5. **Crear carpetas placeholder** para `login/` y `dashboard/` (con `index.html` mínimos).

6. **Actualizar `AGENTS.md`** con:
   - Nueva arquitectura de rutas.
   - Convención para agregar nuevas encuestas (parámetro `?tipo=` + JSON en `config/preguntas/`).
   - Placeholder para documentación de login/dashboard (Fase 3).

## Acceptance criteria

- [x] `/` sin parámetros muestra landing page, no encuesta.
- [x] `/?tipo=compradores` carga encuesta de compradores (41 preguntas) con splash.
- [x] `/?tipo=vendedores` carga encuesta de vendedores (38 preguntas) con splash.
- [x] `/?tipo=proveedores` muestra "Encuesta no disponible aún".
- [x] `/?tipo=invalido` muestra error con tipos válidos.
- [x] Carpetas `login/` y `dashboard/` existen como placeholder.
- [x] `vercel.json` tiene rewrites correctos para todas las rutas.
- [x] `AGENTS.md` documenta la arquitectura completa y convención para nuevas encuestas.
- [x] Sin cambios funcionales en las encuestas existentes (mismas preguntas, mismas validaciones, mismo envío).

## Decisions

- **Yes:** Landing page como placeholder — contenido real se definirá después.
- **Yes:** Carpetas `login/` y `dashboard/` como placeholder — implementación real en Fase 3.
- **Yes:** `app.js` maneja la landing — no crear archivo separado por ahora.
- **No:** Implementar auth ni dashboard — pertenece a Fase 3 (SPECs 13-18).
- **No:** Cambios en preguntas, validaciones, ni contrato de envío.

## Risks

| Risk | Mitigation |
|------|------------|
| `vercel.json` intercepta `/login` con el catch-all | Agregar rewrite explícito antes del catch-all |
| Splash screen se muestra sin `?tipo=` | Condicional en `init()`: solo splash si hay `tipo` válido |
| Landing page sin contenido útil | Placeholder con links a encuestas; contenido real en spec futuro |
