# SPEC 24 — Agregar ESLint + Prettier

> **Status:** Aorobado
> **Depends on:** SPEC 23
> **Date:** 2026-11-02
> **Objective:** Agregar ESLint con flat config y Prettier para linting y formateo automático de código JavaScript, con integración en CI/CD y pre-commit hooks con Husky + lint-staged.

## Contexto

El proyecto tiene tests automatizados (SPEC 23) pero no tiene linting ni formateo de código. Cada desarrollador usa su propio estilo y posibles errores sintácticos o antipatrones pasan sin detectar. Este spec establece estándares de calidad de código automáticos.

## Scope

**In:**

- **ESLint** con `eslint.config.js` (flat config, ESLint v9+).
- **Prettier** integrado con `eslint-config-prettier` (sin conflictos).
- **Scripts** en `package.json`: `lint`, `lint:fix`, `format`, `prepare`.
- **CI/CD**: nuevo job `lint` en `.github/workflows/test.yml` que falla si hay errores.
- **Husky + lint-staged**: pre-commit hook que corre `eslint --fix` y `prettier --write` solo en archivos staged.
- **Archivos linteados**: todos los `*.js` y `*.mjs` del proyecto (`app.js`, `api/encuesta.js`, `lib/*.js`, `build.mjs`, `dashboard/*.js`, `login/*.js`, `tests/**/*.js`, `*.config.js`).

**Out of scope (para futuros specs):**

- Linting de archivos HTML, CSS o JSON.
- Reglas personalizadas de ESLint más allá de las recomendadas.
- Integración con editores (VS Code settings).

## Implementation plan

1. **Instalar dependencias**:
   - `npm install -D eslint prettier eslint-config-prettier husky lint-staged`
   - `npx husky init` (genera `.husky/pre-commit`)

2. **Crear `eslint.config.js`** (flat config):
   - Usa `@eslint/js` (plugin recomendado oficial).
   - Usa `globals` para definir entornos (`browser`, `node`).
   - Reglas base para frontend (jsdom) y node (api).
   - Integra `eslint-config-prettier` para desactivar reglas que chocan con Prettier.
   - Ignora `dist/`, `node_modules/`, `*.min.js`.

3. **Crear `.prettierrc`**:
   - Standard Prettier: `printWidth: 100`, `semi: true`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: 'es5'`.

4. **Crear `.prettierignore`**:
   - `dist/`, `node_modules/`, `package-lock.json`.

5. **Actualizar `package.json`**:
   - Agregar scripts:
     - `"lint": "eslint ."`
     - `"lint:fix": "eslint . --fix"`
     - `"format": "prettier --write ."`
     - `"prepare": "husky"`
   - Agregar `lint-staged` config:
     ```json
     "lint-staged": {
       "*.{js,mjs}": ["eslint --fix", "prettier --write"]
     }
     ```

6. **Configurar Husky**:
   - `npx husky init` genera `.husky/pre-commit` con `npx lint-staged`.
   - Verificar que el hook se ejecuta al hacer commit.

7. **Actualizar CI/CD** (`.github/workflows/test.yml`):
   - Agregar job `lint` que corre antes que `unit-tests` y `e2e-tests`:
     - Checkout → Node 22 → `npm ci` → `npm run lint`
   - Los tests unitarios y E2E dependen del job `lint`.

8. **Aplicar formateo a todo el código existente**:
   - `npm run format` para formatear todos los archivos.
   - `npm run lint:fix` para corregir errores automáticos.
   - Revisar manualmente los errores que no se corrigen automáticamente.

## Acceptance criteria

- [ ] `npm run lint` ejecuta sin errores en todos los archivos `*.js` y `*.mjs`.
- [ ] `npm run lint:fix` corrige errores corregibles automáticamente.
- [ ] `npm run format` formatea todo el código según Prettier.
- [ ] `eslint.config.js` usa flat config con reglas para browser y node.
- [ ] `.prettierrc` tiene config estándar (100 char, single quotes, semicolons).
- [ ] Pre-commit hook (Husky + lint-staged) ejecuta `eslint --fix` y `prettier --write` en archivos staged.
- [ ] CI/CD tiene job `lint` que falla si hay errores de linting.
- [ ] El job `lint` corre antes que `unit-tests` y `e2e-tests` en el workflow.
- [ ] Todos los archivos existentes pasan lint + format sin errores.
- [ ] `dist/` está ignorado por ESLint y Prettier.

## Decisions

- **Yes:** Flat config (`eslint.config.js`) — estándar moderno de ESLint v9+, reemplaza `.eslintrc`.
- **Yes:** `eslint-config-prettier` — desactiva reglas de ESLint que chocan con Prettier, evitando conflictos.
- **Yes:** Husky + lint-staged — asegura que el código commitado siempre pasa lint y format, sin esperar CI.
- **Yes:** CI falla en lint errors — bloquea merges con código que no cumple los estándares.
- **Yes:** Solo `*.js` y `*.mjs` — HTML/CSS/JSON quedan fuera para mantener el scope manejable.
- **No:** Reglas personalizadas complejas — usar recomendaciones oficiales por ahora.
- **No:** Integración con VS Code settings — puede hacerse en otro spec si se necesita.

## Risks

| Risk | Mitigation |
|------|------------|
| Muchos errores de lint en código existente | `lint:fix` corrige la mayoría; revisar manualmente el resto |
| Husky no funciona en algunos entornos CI/CD | Husky se activa solo en pre-commit local; CI corre `npm run lint` independientemente |
| Prettier cambia código de forma inesperada | Revisar diff antes de commitear; `.prettierrc` usa config estándar predecible |

## What is **not** in this spec

- Linting de archivos HTML, CSS o JSON.
- Reglas personalizadas de ESLint más allá de las recomendadas.
- Integración con editores (VS Code settings, editorconfig).
