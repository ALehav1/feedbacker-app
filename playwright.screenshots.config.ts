import { defineConfig, devices } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Playwright Configuration for Screenshot Tests
 *
 * This config is specifically for UI screenshot capture with optional auth support.
 *
 * Usage:
 *   # Start dev server first (in another terminal)
 *   npm run dev
 *
 *   # Run screenshot tests
 *   npx playwright test --config playwright.screenshots.config.ts
 *
 * Authentication:
 *   To test authenticated pages, create auth state first:
 *   1. Run: npx playwright codegen http://localhost:5173 --save-storage=playwright/.auth/state.json
 *   2. Log in via magic link in the browser
 *   3. Close codegen - state is saved
 *
 *   If playwright/.auth/state.json exists, auth-required tests will run.
 *   If not, auth-required tests will skip with a clear message.
 *
 * Environment variables:
 *   TEST_SESSION_SLUG - Slug of an existing active session for participant tests
 */

const AUTH_STATE_PATH = path.join(__dirname, 'playwright', '.auth', 'state.json')
const hasAuthState = fs.existsSync(AUTH_STATE_PATH)

export default defineConfig({
  testDir: './e2e',
  testMatch: 'ui-screenshots.spec.ts',
  fullyParallel: false, // Run sequentially for deterministic screenshots
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for screenshot tests - we want to see failures
  workers: 1, // Single worker for deterministic ordering
  reporter: [['list'], ['html', { open: 'never' }]],

  // Screenshot-specific settings
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off',
    screenshot: 'off', // We take manual screenshots
    video: 'off',
    // Use auth state if available
    ...(hasAuthState ? { storageState: AUTH_STATE_PATH } : {}),
  },

  projects: [
    {
      name: 'screenshots',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Output directory for test artifacts
  outputDir: './test-results/screenshots',

  // No webServer - manual server start is the official flow
  // This avoids issues with Supabase auth and environment variables
  // See docs/REGRESSION_CHECKLIST.md for the official workflow
})
