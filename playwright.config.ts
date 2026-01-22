import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Feedbacker App E2E tests
 *
 * Run tests with: npm run test:e2e
 * Run with UI: npx playwright test --ui
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // Base URL for tests - assumes dev server is running
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Don't auto-start webServer - tests expect dev server to be running manually
  // This avoids complications with Supabase auth and environment variables
})
