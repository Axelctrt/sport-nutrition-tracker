import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'pwa-update-retention.spec.ts',
  outputDir: 'test-results/playwright-pwa',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 30_000,
  },
  reporter: process.env.CI
    ? [
        ['line'],
        ['html', { outputFolder: 'playwright-report-pwa', open: 'never' }],
      ]
    : [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4174',
    locale: 'fr-FR',
    timezoneId: 'Africa/Tunis',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'node scripts/pwa-update-test-server.mjs',
    url: 'http://127.0.0.1:4174/__pwa-test/health',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
