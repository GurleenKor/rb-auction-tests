import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: env.ci,
  retries: env.ci ? 2 : 0,
  workers: env.workers,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],
  use: {
    baseURL: env.baseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: 'e2e', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'] } },
    { name: 'api', testDir: './tests/api' },
    { name: 'unit', testDir: './tests/unit' },
  ],
});
