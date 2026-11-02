# SPEC 26 — Actualizar `AGENTS.md` con comandos de test y lint

> **Status:** Aprobado
> **Depends on:** SPEC 23, SPEC 24
> **Date:** 2026-11-02
> **Objective:** Documentar en `AGENTS.md` los comandos de testing (Vitest, Playwright) y linting (ESLint, Prettier) agregados en los specs anteriores, incluyendo scripts de `package.json`, estructura de tests, y configuración de CI/CD.

## Contexto

Los specs 23 y 24 agregaron infraestructura de testing (84 unit tests + 12 E2E tests) y linting/formatting (ESLint + Prettier + Husky). `AGENTS.md` no refleja estos cambios, por lo que nuevos desarrolladores o agentes de IA no saben cómo ejecutar tests, correr lint, o entender la estructura del proyecto actualizada.

## Scope

**In:**

- **Sección de Commands** actualizada con `npm run test`, `test:unit`, `test:unit:watch`, `test:e2e`, `lint`, `lint:fix`, `format`.
- **Sección de Testing** describiendo:
  - Frameworks: Vitest (unit), Playwright (E2E)
  - Estructura: `tests/unit/` y `tests/e2e/`
  - Configuración: `vitest.config.js`, `vitest-api.config.js`, `playwright.config.js`
  - CI/CD: GitHub Actions workflow
- **Sección de Linting/Formatting** describiendo:
  - ESLint con flat config (`eslint.config.js`)
  - Prettier (`.prettierrc`, `.prettierignore`)
  - Husky + lint-staged (pre-commit hook)
- **Estructura de archivos** actualizada con nuevos archivos.

**Out of scope (para futuros specs):**

- Documentación de la landing page (SPEC futuro).
- Reglas de linting personalizadas.
- Configuración de editores (VS Code settings).

## Implementation plan

1. **Actualizar sección `Commands`** en `AGENTS.md`:
   - Agregar `npm run test` → corre unit + E2E
   - Agregar `npm run test:unit` → solo Vitest
   - Agregar `npm run test:unit:watch` → modo watch
   - Agregar `npm run test:e2e` → solo Playwright
   - Agregar `npm run lint` → ESLint
   - Agregar `npm run lint:fix` → ESLint --fix
   - Agregar `npm run format` → Prettier

2. **Agregar sección `Testing`**:
   - Descripción de Vitest (unit) y Playwright (E2E)
   - Estructura de archivos de tests
   - Cómo mockear la API en E2E
   - CI/CD workflow

3. **Agregar sección `Linting & Formatting`**:
   - ESLint config (flat config)
   - Prettier config
   - Husky pre-commit hook

4. **Actualizar `Project structure`** con nuevos archivos:
   - `lib/draft.js`, `lib/conditions.js`, `lib/envio.js`
   - `tests/`, `eslint.config.js`, `.prettierrc`, `.husky/`

5. **Actualizar `Build` section** si es necesario.

## Acceptance criteria

- [ ] `AGENTS.md` tiene sección de Commands con todos los scripts.
- [ ] `AGENTS.md` tiene sección de Testing con descripción de frameworks y estructura.
- [ ] `AGENTS.md` tiene sección de Linting & Formatting.
- [ ] `AGENTS.md` tiene estructura de archivos actualizada.
- [ ] La documentación es precisa y verificable (un nuevo dev puede seguirla sin ambigüedad).
- [ ] No se rompieron links ni formato markdown.

## Decisions

- **Yes:** Una sola sección de Testing que cubra tanto unit como E2E — más fácil de encontrar.
- **Yes:** Incluir CI/CD en la sección de Testing — muestra cómo se ejecutan en producción.
- **No:** Documentar cada regla de ESLint — solo la configuración general, no las reglas específicas.
- **No:** Mover otra documentación existente — solo agregar las secciones nuevas.

## Risks

| Risk | Mitigation |
|------|------------|
| `AGENTS.md` se vuelve muy largo | Usar sub-secciones claras y concisas |
| Información desactualizada con el tiempo | Los specs futuros deben actualizar `AGENTS.md` como parte del scope |

## What is **not** in this spec

- Documentación de la landing page.
- Reglas de linting personalizadas.
- Configuración de editores (VS Code settings).
