import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4175'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  timeout: 45_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    channel: 'chrome',
    headless: true,
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
