import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Tests must never hit the network or the database: everything runs on
    // saved HTML fixtures and injected fakes (see recipeImport/__tests__).
    testTimeout: 10000,
  },
});
