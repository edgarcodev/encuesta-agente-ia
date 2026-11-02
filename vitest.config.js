import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/conditions.test.js', 'tests/unit/enviar.test.js'],
    globals: true,
  },
});
