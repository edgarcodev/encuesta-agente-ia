# AGENTS.md

## Stack (verify before assuming anything)

- **No `package.json`, no build step, no test runner, no CI.** It is a single vanilla HTML file (`index.html`) deployed to Vercel.
- **Frontend:** `index.html` (HTML + embedded CSS + vanilla JS). The JS renders survey steps, collects answers, and POSTs to `/api/encuesta`.
- **Backend:** `api/encuesta.js` — a Vercel serverless function (default export `handler(req, res)`). It proxies `POST` body to Supabase table `respuestas_encuesta` using `SUPABASE_SERVICE_KEY`.
- **Database:** Supabase. Table `respuestas_encuesta` stores `{ datos }` JSONB.
- **DB schema migrations:** live versioned in `supabase/migrations/NNNN_name.sql` (schema only — never data fixes). Each migration must be applied **exactly once** to the production SQL editor; the files deliberately avoid `if not exists` so a re-run fails loudly. They are also recorded in `supabase_migrations.schema_migrations` when applied via the MCP/CLI. Today: `0001_rate_limits.sql` (SPEC 03, `rate_limits` table + `increment_rate_limit` RPC).
- **Static:** `images/megaremates.svg` (logo).
- **Reference template:** `references/vendedores/` mirrors the same structure (`index.html`, `api/encuesta.js`, `vercel.json`) for adding more survey types (vendedores, proveedores).

## Environment (will break silently if missed)

- `.env` is **gitignored** and contains real Supabase credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SECRET_NONCE`).
- `.env.example` exists but uses `echo` commands (not a standard dotenv template).
- In production these must be set in the **Vercel dashboard → Settings → Environment Variables**, not from a local file.
- Locally: create `.env` with the three variables above before testing the API function.

## Vercel routing gotcha (high-impact, easy to miss)

`vercel.json` currently has a **catch-all** rewrite:

```json
{ "rewrites": [ { "source": "/(.*)", "destination": "/" } ] }
```

This intercepts `/api/encuesta` and serves `index.html` instead of executing the serverless function. **Before deploying or testing API routes, add an API rewrite ahead of the catch-all:**

```json
{ "rewrites": [
  { "source": "/api/(.*)", "destination": "/api/$1" },
  { "source": "/(.*)", "destination": "/" }
]}
```

## Security gotchas (do not ignore)

- `api/encuesta.js` uses `SUPABASE_SERVICE_KEY` which **bypasses RLS** (full admin access). It validates `token` by **exact equality against `process.env.SECRET_NONCE`** and fails closed (500, nothing saved) if that variable is missing or empty. The secret's value is embedded in `index.html` as `const NONCE` (public by design, SPEC 02); rotating it requires updating three places at once: `.env`, the Vercel dashboard, and `index.html`.
- **Rate limiting: 5 POST / 10 min por IP** (SPEC 03). Every POST — including invalid tokens and bad payloads — calls the PostgREST RPC `increment_rate_limit(p_ip)` *before* the token check; a persistent counter lives in the `rate_limits` table (one row per IP, fixed window). When `count > 5` the API answers `429` with a `Retry-After` header. The limit itself is `const RATE_LIMIT_MAX = 5` in `api/encuesta.js`; the SQL function only counts. The RPC fails **open** (`console.error` and continue) because `SECRET_NONCE` remains the real gate. IP source: `x-real-ip` (set by Vercel, not spoofable) → first entry of `x-forwarded-for` → `'unknown'`. No CAPTCHA, no schema validation on `datos`.
- Frontend calls `https://ipapi.co/json/` on load without user consent (privacy/GDPR concern).

## Git / file conventions

- `.gitignore`: `.env`, `auditoria/`, `references/`.
- `.gitattributes`: forces `LF` line endings for `*.js` and `*.json`; `* text=auto` for everything else.
- Do not commit `.env`. `auditoria/` and `references/` are intentionally untracked.

## Spec-driven development (this repo's workflow)

- Two skills are installed and pinned in `skills-lock.json`: `spec` and `spec-impl` (source: `klerith/fernando-skills`).
- Skill definitions live in `.agents/skills/spec/SKILL.md` and `.agents/skills/spec-impl/SKILL.md`.
- Use `/spec <feature>` to design a spec (Phase 1–4, saves to `specs/`), then `/spec-impl <NN-slug>` to implement an **Approved** spec on a git branch.
- Specs are written in Spanish in this repo; state labels use Spanish (`Borrador`, `Aprobado`, `Implementado`).
- `/spec-impl` only proceeds if spec state means "Approved"; it creates branch `spec-NN-slug`, pauses after each step for diff review, and never commits automatically.

## Pantalla splash de bienvenida (requisito de marca)

Cada encuesta pública inicia con una pantalla splash antes del primer paso:

- **Imagen:** `images/megaremates.svg`
- **Texto:** "Encuesta realizada por MegaRemates"
- **Fondo:** amarillo `#fff100`
- **Acción:** botón "Comenzar encuesta" que oculta el splash y muestra el formulario

Está implementado en `index.html` con el elemento `#splashScreen` (oculto por defecto en el contenedor `#app` hasta que el usuario hace clic). Un agente futuro que modifique el flujo de inicio debe respetar esta pantalla y no saltarse directamente a `renderStep()`.

## Commands

There are **no npm/test/lint scripts**. Verification is manual:
- Open `index.html` in a browser to test the survey frontend.
- Deploy to Vercel (or use Vercel CLI) to test `api/encuesta.js`; local execution of the serverless function requires the Vercel runtime or a compatible fetch shim.

## Adding a new survey type

- Copy `references/vendedores/` structure and adapt `index.html` questions and `api/encuesta.js` as needed.
- Add a `tipo_encuesta` column (`compradores`, `vendedores`, `proveedores`) to `respuestas_encuesta` if you want a shared table for all survey types.
