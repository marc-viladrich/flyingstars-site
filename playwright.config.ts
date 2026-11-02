import { defineConfig, devices } from '@playwright/test';
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4399);

// Tests laufen gegen den gebauten Output (astro preview), nicht gegen den Dev-Server,
// damit genau das geprüft wird, was deployt wird.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  webServer: { command: `npx astro preview --ignore-lock --host 127.0.0.1 --port ${port}`, url: `http://127.0.0.1:${port}/`, reuseExistingServer: false, timeout: 60_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
});
