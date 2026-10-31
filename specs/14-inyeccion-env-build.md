# SPEC 14 — Inyección segura de `SUPABASE_ANON_KEY` durante el build

> **Status:** Borrador
> **Depends on:** SPEC 13
> **Date:** 2026-10-31
> **Objective:** Eliminar `SUPABASE_ANON_KEY` hardcodeada en `login/auth.js` y `dashboard/dashboard.js`. Inyectarla de forma segura durante el build desde variables de entorno.

## Contexto

En SPEC 13, `SUPABASE_ANON_KEY` quedó embebida directamente en `login/auth.js` y `dashboard/dashboard.js`. Esto es un riesgo de seguridad si el repositorio se hace público y dificulta la rotación de keys (requiere editar código).

## Scope

**In:**

- Modificar `build.mjs` para inyectar `SUPABASE_ANON_KEY` desde `process.env` durante el build.
- Usar placeholder `__SUPABASE_ANON_KEY__` en los archivos fuente (`login/auth.js`, `dashboard/dashboard.js`, y los HTML que cargan Supabase CDN).
- El build falla si `SUPABASE_ANON_KEY` no está definida (fail closed).
- En Vercel, la variable se configura en Settings → Environment Variables.
- Para desarrollo local, crear `.env.example` con la variable documentada.
- `SUPABASE_URL` también se inyecta desde el entorno (misma lógica).

**Out of scope:**

- Cambios en la lógica de auth (SPEC 13 ya funciona).
- RLS policies (SPEC 15).
- Middleware de Vercel (Edge Functions).

## Implementation plan

1. **Crear `.env.example`** con las variables necesarias:
   ```
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxx
   ```

2. **Actualizar `login/auth.js` y `dashboard/dashboard.js`**:
   - Reemplazar strings hardcodeados por placeholders:
     ```js
     const SUPABASE_URL = '__SUPABASE_URL__';
     const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
     ```

3. **Actualizar `build.mjs`**:
   - Leer `process.env.SUPABASE_URL` y `process.env.SUPABASE_ANON_KEY`.
   - Fallar si alguna no está definida.
   - Reemplazar placeholders en los archivos copiados a `dist/`.

4. **Actualizar `login/index.html` y `dashboard/index.html`**:
   - Agregar `<script>` con placeholders para que el build los inyecte antes de que carguen los JS:
     ```html
     <script>
       window.SUPABASE_URL = '__SUPABASE_URL__';
       window.SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
     </script>
     ```
   - Los archivos `.js` leen de `window.SUPABASE_URL` y `window.SUPABASE_ANON_KEY`.

5. **Actualizar `.gitignore`** para excluir `.env` (ya está) y `.env.local`.

6. **Actualizar `AGENTS.md`** con la convención de variables de entorno para el build.

## Acceptance criteria

- [ ] No hay `SUPABASE_ANON_KEY` ni `SUPABASE_URL` hardcodeadas en el código fuente.
- [ ] `build.mjs` inyecta las variables desde `process.env`.
- [ ] El build falla si las variables no están definidas.
- [ ] `.env.example` existe con las variables documentadas.
- [ ] `login/auth.js` lee las variables de `window.SUPABASE_*`.
- [ ] `dashboard/dashboard.js` lee las variables de `window.SUPABASE_*`.
- [ ] En Vercel, las variables se configuran como Environment Variables.
- [ ] `AGENTS.md` documenta el flujo de inyección.

## Decisions

- **Yes:** Placeholder en los archivos fuente → reemplazo en el build.
- **Yes:** `window.SUPABASE_*` global → accesible desde los JS externos.
- **Yes:** Fail closed — el build debe fallar si las variables no existen.
- **No:** Usar archivos `.env` en producción — Vercel usa su propio sistema de variables.

## Risks

| Risk | Mitigation |
|------|------------|
| Build local falla sin `.env` | Documentar en `.env.example` y en `AGENTS.md` |
| Placeholder no se reemplaza correctamente | Validar en el build que no queden `__SUPABASE_*__` en `dist/` |
| CDN de Supabase cachea versiones viejas | Usar versión específica en la URL del CDN (`@supabase/supabase-js@2.48.1`) |
