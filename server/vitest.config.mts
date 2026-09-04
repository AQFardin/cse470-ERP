import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    testTimeout: 20000,
    // Run test files serially: they share the real dev.db (SQLite, single-writer)
    // rather than an isolated test database, so parallel files would race.
    fileParallelism: false,
  },
});
