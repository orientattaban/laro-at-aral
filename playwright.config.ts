import { defineConfig } from '@playwright/test';

// These tests open the BUILT app (the same files that get published)
// and prove it works offline and never talks to another server.
// On the laptop they use the Microsoft Edge that is already installed,
// so nothing extra is downloaded. On GitHub they use Chromium.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/',
    viewport: { width: 740, height: 360 },
    channel: process.env.CI ? undefined : 'msedge',
    serviceWorkers: 'allow',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
