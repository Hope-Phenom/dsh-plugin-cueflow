import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:5199',
    channel: 'msedge',
    viewport: { width: 900, height: 900 },
    headless: true,
  },
  webServer: {
    command: 'pnpm ui',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
