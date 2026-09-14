import { defineConfig } from 'vitest/config';

/**
 * Tests run against a dedicated `marketplace_test` database and the in-memory
 * core banking adapter, so they need Postgres but not the Go service:
 *
 *   docker compose up -d postgres
 *   npm test
 *
 * The test env is applied to the worker processes via `env` below, and to this
 * process (which runs globalSetup) via the assignments above it.
 */
const testEnv = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  CORE_BANKING_ADAPTER: 'memory',
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/marketplace_test',
  JWT_SECRET: 'test-jwt-secret-at-least-16-chars',
  ADMIN_KEY: 'test-admin-key-at-least-16-chars',
  // These tests are about consent enforcement, not quotas. Keep the limiter out
  // of the way so it can never flake a run.
  RATE_LIMIT_MAX: '100000',
};

for (const [key, value] of Object.entries(testEnv)) process.env[key] = value;

export default defineConfig({
  test: {
    globalSetup: ['./tests/globalSetup.ts'],
    env: testEnv,
    // One worker: the suite truncates shared tables between files.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
