import { defineConfig, devices } from '@playwright/test';

const pwaUpdateTestPort = Number(process.env.PWA_UPDATE_TEST_PORT ?? 4174);
const pwaUpdateTestBaseUrl = `http://127.0.0.1:${pwaUpdateTestPort}`;

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
    baseURL: pwaUpdateTestBaseUrl,
    locale: 'fr-FR',
    timezoneId: 'Africa/Tunis',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'node scripts/pwa-update-test-server.mjs',
    url: `${pwaUpdateTestBaseUrl}/__pwa-test/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
