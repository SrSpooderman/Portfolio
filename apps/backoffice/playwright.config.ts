import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4174', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL } }],
  webServer: process.env.E2E_NO_WEBSERVER ? undefined : {
    command: 'node ../../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://localhost:4174/backoffice/',
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGINT', timeout: 1_000 },
  },
});
