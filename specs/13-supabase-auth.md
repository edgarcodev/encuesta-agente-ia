# SPEC 13 — Integrar Supabase Auth (login email/contraseña)

> **Status:** Borrador
> **Depends on:** SPEC 12
> **Date:** 2026-10-31
> **Objective:** Agregar autenticación con Supabase Auth (email + contraseña) a la página `/login`, proteger `/dashboard` con sesión válida, y manejar la sesión del usuario.

## Contexto

El proyecto tiene placeholders para `/login` y `/dashboard` desde SPEC 12. Ahora es momento de implementar la autenticación real usando Supabase Auth con el provider de email/password, que es el más simple y no requiere configuración de terceros.

## Scope

**In:**

- Instalar `@supabase/supabase-js` como dependencia de producción.
- Crear `login/index.html` con formulario de login (email + contraseña).
- Crear `login/auth.js` con lógica de Supabase Auth:
  - `signIn(email, password)` → redirige a `/dashboard` si éxito.
  - Manejo de errores (credenciales incorrectas, cuenta no verificada, etc.).
  - Persistencia de sesión (localStorage por defecto de Supabase).
  - `signOut()` → cierra sesión y redirige a `/login`.
- Proteger `dashboard/index.html` — si no hay sesión válida, redirigir a `/login`.
- Botón de logout en el dashboard.
- Configurar Supabase Auth en el proyecto (email/password provider).
- Variables de entorno: `SUPABASE_URL` y `SUPABASE_ANON_KEY` (para el cliente).

**Out of scope:**

- Registro de nuevos usuarios (solo login, no signup).
- Recuperación de contraseña (forgot password).
- OAuth (Google, GitHub, etc.).
- Roles de usuario (admin, viewer) — eso va en SPEC 14.
- RLS policies — eso va en SPEC 15.
- Gráficos ni dashboard funcional — eso va en SPEC 16.

## Arquitectura

```
login/
├── index.html          ← Formulario de login
├── auth.js             ← Supabase Auth: signIn, signOut, session check
└── styles.css          ← Estilos específicos del login (opcional, puede usar styles.css compartido)

dashboard/
├── index.html          ← Dashboard protegido (placeholder + sesión check)
└── dashboard.js        ← Verifica sesión, redirige a /login si no hay sesión
```

### Flujo de login

1. Usuario visita `/login` → ve formulario email + contraseña.
2. Ingresa credenciales → `auth.js` llama `supabase.auth.signInWithPassword()`.
3. Si éxito → `window.location.href = '/dashboard'`.
4. Si error → muestra mensaje claro ("Credenciales incorrectas", "Cuenta no verificada", etc.).

### Flujo de protección del dashboard

1. Usuario visita `/dashboard` → `dashboard.js` verifica `supabase.auth.getSession()`.
2. Si hay sesión → muestra contenido del dashboard.
3. Si no hay sesión → `window.location.href = '/login'`.
4. Botón "Cerrar sesión" → `supabase.auth.signOut()` → redirige a `/login`.

### Variables de entorno

| Variable | Uso |
|----------|-----|
| `SUPABASE_URL` | URL del proyecto Supabase (misma que ya se usa en el backend) |
| `SUPABASE_ANON_KEY` | Publishable API key (para el cliente, NO la service_role key) |

**Importante:** En Vercel, estas variables deben estar expuestas al cliente. Para Vercel, el prefijo `NEXT_PUBLIC_` no aplica porque no usamos Next.js. En su lugar, se inyectan en el HTML durante el build o se leen desde `vercel.json` con `env` rewrites. La forma más simple es inyectarlas en un `<script>` en `index.html` durante el build.

## Implementation plan

1. **Instalar `@supabase/supabase-js`** como dependencia.
2. **Crear `login/index.html`** con formulario de login y referencia a Supabase CDN o bundle local.
3. **Crear `login/auth.js`** con:
   - Inicialización del cliente Supabase.
   - `signIn(email, password)` → manejo de respuesta y errores.
   - `signOut()` → cierra sesión y redirige.
   - `getSession()` → verifica sesión existente.
4. **Actualizar `dashboard/index.html`** con:
   - Verificación de sesión al cargar.
   - Botón de logout.
   - Placeholder para contenido futuro.
5. **Crear `dashboard/dashboard.js`** con:
   - `requireAuth()` → redirige a `/login` si no hay sesión.
   - Mostrar email del usuario logueado.
6. **Configurar Supabase Auth** en el proyecto:
   - Habilitar Email provider en Supabase Dashboard → Authentication → Providers.
   - Desactivar "Confirm email" para desarrollo (o manejar verificación).
   - Crear usuario admin manualmente en Supabase Dashboard → Authentication → Users.
7. **Configurar variables de entorno** en Vercel:
   - `SUPABASE_URL` (ya existente).
   - `SUPABASE_ANON_KEY` (publishable key del proyecto).
8. **Actualizar `vercel.json`** si es necesario para servir archivos de `login/` y `dashboard/`.
9. **Actualizar `AGENTS.md`** con documentación de autenticación.

## Acceptance criteria

- [ ] `@supabase/supabase-js` instalado como dependencia.
- [ ] `/login` muestra formulario con email + contraseña + botón "Iniciar sesión".
- [ ] Login exitoso → redirige a `/dashboard`.
- [ ] Login fallido → muestra mensaje de error claro.
- [ ] `/dashboard` sin sesión → redirige a `/login`.
- [ ] `/dashboard` con sesión → muestra contenido (placeholder por ahora) + email del usuario.
- [ ] Botón "Cerrar sesión" en dashboard → cierra sesión y redirige a `/login`.
- [ ] Sesión persiste entre recargas de página (localStorage).
- [ ] Variables de entorno configuradas para Supabase Auth (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
- [ ] Usuario admin creado manualmente en Supabase Dashboard.
- [ ] `AGENTS.md` documenta el flujo de autenticación y variables necesarias.

## Decisions

- **Yes:** Solo login, sin signup — los usuarios se crean manualmente en Supabase Dashboard.
- **Yes:** Email/password provider — simple, no requiere OAuth de terceros.
- **Yes:** `SUPABASE_ANON_KEY` en el cliente — es seguro para operaciones de auth; RLS protege los datos.
- **Yes:** Sesión persiste en localStorage — comportamiento por defecto de Supabase Auth.
- **No:** Confirmación de email por ahora — se desactiva en dev para facilitar pruebas.
- **No:** Roles ni RLS — pertenece a SPEC 14 y 15.

## Risks

| Risk | Mitigation |
|------|------------|
| Sin usuarios creados en Supabase | Crear usuario admin manualmente en Supabase Dashboard → Authentication → Users |
| Confusión entre anon key y service role key | Usar solo `ANON_KEY` en el cliente; `SERVICE_KEY` solo en serverless (`api/encuesta.js`) |
| Variables de entorno no expuestas al cliente | Inyectar en `<script>` durante el build o usar `vercel.json` env rewrites |
| Sesión expira y usuario queda en dashboard | `dashboard.js` verifica sesión en cada carga; si expira, redirige a `/login` |
