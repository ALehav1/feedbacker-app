// playwright.screenshots.config.ts
import { defineConfig } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const AUTH_STATE_PATH = path.join(process.cwd(), 'playwright', '.auth', 'state.json')
const HAS_AUTH_STATE = fs.existsSync(AUTH_STATE_PATH)

export default defineConfig({
  testDir: './e2e',
  testMatch: /ui-screenshots\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:5173',
    // Tests take screenshots explicitly into artifacts/screenshots.
    screenshot: 'off',
    video: 'off',
    trace: 'off',
    ...(HAS_AUTH_STATE ? { storageState: AUTH_STATE_PATH } : {}),
  },
})
