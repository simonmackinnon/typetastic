/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

// Opt-in smoke test for the Vite *dev* server (`npm run test:dev-smoke`).
// CI and `test:e2e` only exercise the production build, which is why a
// dev-only breakage (TYP-11: "global is not defined") went unnoticed.
export default defineConfig({
  testDir: './tests/dev-smoke',
  reporter: 'list',
  // A cold Vite cache can discover a dependency mid-run and force a full page
  // reload; one retry absorbs that. Timeouts cap it rather than hang.
  retries: 1,
  timeout: 30_000,
  globalTimeout: 180_000,
  use: { baseURL: 'http://localhost:5174' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
