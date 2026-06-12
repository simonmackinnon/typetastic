/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  // On CI the workflow pre-builds dist/ and starts the preview server via the
  // workflow step before running tests, so we just reuse it.
  // Locally, this command boots the server automatically.
  projects: process.env.CI
    ? [
        // CI: Chromium only — fast and catches regressions
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      ]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
        { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
      ],
  webServer: {
    // On CI the dist/ is already built; just start preview.
    // Locally, build then preview.
    command: process.env.CI ? 'npm run preview' : 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
