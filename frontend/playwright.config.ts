import { defineConfig } from '@playwright/test';

const PORT = 4173;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel: 'chrome',
    headless: true,
    ignoreHTTPSErrors: true,
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: `npx vite preview --port ${PORT} --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 30000,
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        viewport: { width: 1920, height: 1080 },
        channel: 'chrome',
      },
    },
  ],
});
