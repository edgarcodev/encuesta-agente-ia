import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'references/**',
      '*.css',
      '*.html',
      '*.md',
      '*.json',
      '*.yml',
    ],
  },

  // Base recommended rules
  js.configs.recommended,

  // Config files (Node.js globals like `process`)
  {
    files: ['*.config.js', 'build.mjs', 'tests/unit/api.test.js', 'vitest-api.config.js'],
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

  // Browser files (app.js, lib)
  {
    files: ['app.js', 'lib/*.js', 'vitest.config.js'],
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

  // Login files (browser globals)
  {
    files: ['login/*.js'],
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

  // E2E test files
  {
    files: ['tests/e2e/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
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

  // Dashboard files (Chart.js via CDN)
  {
    files: ['dashboard/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
        Chart: 'readonly',
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
        ...globals.node,
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
