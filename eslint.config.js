import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },

  // Base recommended rules
  js.configs.recommended,

  // Browser files (frontend, tests/e2e)
  {
    files: ['app.js', 'lib/*.js', 'dashboard/*.js', 'login/*.js', 'tests/e2e/*.spec.js', '*.config.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },

  // Node.js files (API, build script, API tests)
  {
    files: ['api/*.js', 'build.mjs', 'tests/unit/api.test.js', 'vitest-api.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },

  // Vitest test files (non-API)
  {
    files: ['tests/unit/conditions.test.js', 'tests/unit/enviar.test.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },

  // Prettier config (must be last to override conflicting rules)
  prettierConfig,
];
