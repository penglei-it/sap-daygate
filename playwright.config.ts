import { defineConfig, devices } from '@playwright/test';

/**
 * Optional real-browser E2E. Use when a launchable browser channel is available:
 *   PW_CHANNEL=chrome npm run test:e2e:browser
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /smoke\.spec\.ts/,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: process.env.PW_CHANNEL || 'chrome',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
