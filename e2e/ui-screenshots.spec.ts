import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * UI Screenshot Test Suite - Golden Path
 *
 * Captures screenshots at mobile (375px) and desktop (1024px) viewports
 * for visual verification of UI consistency.
 *
 * Configuration:
 *   Use the dedicated config: npx playwright test --config playwright.screenshots.config.ts
 *
 * Authentication:
 *   If playwright/.auth/state.json exists, authenticated tests will run.
 *   To create auth state:
 *   1. npx playwright codegen http://localhost:5173 --save-storage=playwright/.auth/state.json
 *   2. Log in via magic link
 *   3. Close codegen
 *
 * Environment variables:
 *   TEST_SESSION_SLUG - Slug of an existing active session for participant page tests
 *
 * Screenshots are saved to: ./artifacts/screenshots/
 */

const SCREENSHOT_DIR = './artifacts/screenshots'
const SESSION_SLUG = process.env.TEST_SESSION_SLUG || ''

// Check if auth state file exists for authenticated tests
const AUTH_STATE_PATH = path.join(__dirname, '..', 'playwright', '.auth', 'state.json')
const HAS_AUTH_STATE = fs.existsSync(AUTH_STATE_PATH)

/**
 * Assertion: No horizontal overflow at 375px
 * Checks that document width equals viewport width (no scrollable overflow)
 */
async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth
  })
  expect(overflow, 'Page has horizontal overflow at 375px').toBe(false)
}

/**
 * Assertion: Only one "Copy link" block on page
 * Ensures no duplicate copy link UI elements
 */
async function assertSingleCopyLinkBlock(page: import('@playwright/test').Page) {
  const copyLinkButtons = page.locator('button:has-text("Copy link")')
  const count = await copyLinkButtons.count()
  expect(count, `Expected at most 1 "Copy link" button, found ${count}`).toBeLessThanOrEqual(1)
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC PAGES (No Auth Required)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Golden Path - Public Pages', () => {
  test.describe('Mobile (375px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
    })

    test('login page - no overflow', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('text=Presentation Feedbacker')).toBeVisible()
      await assertNoHorizontalOverflow(page)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login-mobile.png`, fullPage: true })
    })

    test('participant feedback form - active session', async ({ page }) => {
      if (!SESSION_SLUG) {
        test.skip(true, 'TEST_SESSION_SLUG not set - skipping participant page test')
        return
      }

      await page.goto(`/s/${SESSION_SLUG}`)
      await page.waitForLoadState('networkidle')

      // Wait for content to load (either topics or error)
      const hasTopics = await page.locator('text=Proposed Topics').isVisible({ timeout: 5000 }).catch(() => false)
      const hasError = await page.locator('text=Presentation Not Found').isVisible({ timeout: 1000 }).catch(() => false)

      if (hasError) {
        test.skip(true, `Session ${SESSION_SLUG} not found - skipping`)
        return
      }

      if (hasTopics) {
        await assertNoHorizontalOverflow(page)
      }

      await page.screenshot({ path: `${SCREENSHOT_DIR}/02-feedback-form-mobile.png`, fullPage: true })
    })

    test('participant feedback form - closed session banner', async ({ page }) => {
      if (!SESSION_SLUG) {
        test.skip(true, 'TEST_SESSION_SLUG not set')
        return
      }

      await page.goto(`/s/${SESSION_SLUG}`)
      await page.waitForLoadState('networkidle')

      // Check for closed banner (if session is completed)
      const closedBanner = page.locator('text=Participant feedback is closed')
      const isClosed = await closedBanner.isVisible({ timeout: 2000 }).catch(() => false)

      if (isClosed) {
        await assertNoHorizontalOverflow(page)
        await page.screenshot({ path: `${SCREENSHOT_DIR}/02b-feedback-closed-mobile.png`, fullPage: true })
      }
    })
  })

  test.describe('Desktop (1024px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 })
    })

    test('login page', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('text=Presentation Feedbacker')).toBeVisible()
      await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login-desktop.png`, fullPage: true })
    })

    test('participant feedback form - active session', async ({ page }) => {
      if (!SESSION_SLUG) {
        test.skip(true, 'TEST_SESSION_SLUG not set')
        return
      }

      await page.goto(`/s/${SESSION_SLUG}`)
      await page.waitForLoadState('networkidle')

      const hasError = await page.locator('text=Presentation Not Found').isVisible({ timeout: 3000 }).catch(() => false)
      if (hasError) {
        test.skip(true, `Session ${SESSION_SLUG} not found`)
        return
      }

      await page.screenshot({ path: `${SCREENSHOT_DIR}/02-feedback-form-desktop.png`, fullPage: true })
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// PROTECTED PAGES (Auth Required - Skipped if not logged in)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Golden Path - Dashboard (requires auth)', () => {
  test.beforeAll(() => {
    if (!HAS_AUTH_STATE) {
      console.log('\n⚠️  Auth state not found at playwright/.auth/state.json')
      console.log('   To enable authenticated tests, run:')
      console.log('   npx playwright codegen http://localhost:5173 --save-storage=playwright/.auth/state.json\n')
    }
  })

  test.describe('Mobile (375px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
    })

    test('dashboard - no overflow, single copy link', async ({ page }) => {
      if (!HAS_AUTH_STATE) {
        test.skip(true, 'No auth state - run: npx playwright codegen http://localhost:5173 --save-storage=playwright/.auth/state.json')
        return
      }

      await page.goto('/dashboard')

      const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
      if (isLogin) {
        test.skip(true, 'Auth state expired - regenerate with playwright codegen')
        return
      }

      await page.waitForLoadState('networkidle')
      await assertNoHorizontalOverflow(page)
      await assertSingleCopyLinkBlock(page)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/03-dashboard-mobile.png`, fullPage: true })
    })
  })

  test.describe('Desktop (1024px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 })
    })

    test('dashboard', async ({ page }) => {
      if (!HAS_AUTH_STATE) {
        test.skip(true, 'No auth state - run: npx playwright codegen http://localhost:5173 --save-storage=playwright/.auth/state.json')
        return
      }

      await page.goto('/dashboard')

      const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
      if (isLogin) {
        test.skip(true, 'Auth state expired - regenerate with playwright codegen')
        return
      }

      await page.waitForLoadState('networkidle')
      await assertSingleCopyLinkBlock(page)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/03-dashboard-desktop.png`, fullPage: true })
    })
  })
})

test.describe('Golden Path - Session Detail (requires auth)', () => {
  test.describe('Mobile (375px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
    })

    test('session detail - active - no overflow, single copy link', async ({ page }) => {
      if (!HAS_AUTH_STATE) {
        test.skip(true, 'No auth state - run: npx playwright codegen http://localhost:5173 --save-storage=playwright/.auth/state.json')
        return
      }

      await page.goto('/dashboard')

      const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
      if (isLogin) {
        test.skip(true, 'Auth state expired - regenerate with playwright codegen')
        return
      }

      // Find first active session card and click
      const activeSessionCard = page.locator('text=Active Sessions').locator('..').locator('button:has-text("Open details")').first()
      const hasActive = await activeSessionCard.isVisible({ timeout: 3000 }).catch(() => false)

      if (!hasActive) {
        test.skip(true, 'No active sessions found')
        return
      }

      await activeSessionCard.click()
      await page.waitForLoadState('networkidle')

      await assertNoHorizontalOverflow(page)
      await assertSingleCopyLinkBlock(page)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/04-session-detail-active-mobile.png`, fullPage: true })
    })

    test('session detail - closed - no overflow', async ({ page }) => {
      if (!HAS_AUTH_STATE) {
        test.skip(true, 'No auth state - run: npx playwright codegen http://localhost:5173 --save-storage=playwright/.auth/state.json')
        return
      }

      await page.goto('/dashboard')

      const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
      if (isLogin) {
        test.skip(true, 'Auth state expired - regenerate with playwright codegen')
        return
      }

      // Find first closed session card and click
      const closedSessionCard = page.locator('text=Closed Sessions').locator('..').locator('button:has-text("Open details")').first()
      const hasClosed = await closedSessionCard.isVisible({ timeout: 3000 }).catch(() => false)

      if (!hasClosed) {
        test.skip(true, 'No closed sessions found')
        return
      }

      await closedSessionCard.click()
      await page.waitForLoadState('networkidle')

      await assertNoHorizontalOverflow(page)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/05-session-detail-closed-mobile.png`, fullPage: true })
    })
  })

  test.describe('Desktop (1024px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 })
    })

    test('session detail - active', async ({ page }) => {
      if (!HAS_AUTH_STATE) {
        test.skip(true, 'No auth state - run: npx playwright codegen http://localhost:5173 --save-storage=playwright/.auth/state.json')
        return
      }

      await page.goto('/dashboard')

      const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
      if (isLogin) {
        test.skip(true, 'Auth state expired - regenerate with playwright codegen')
        return
      }

      const activeSessionCard = page.locator('text=Active Sessions').locator('..').locator('button:has-text("Open details")').first()
      const hasActive = await activeSessionCard.isVisible({ timeout: 3000 }).catch(() => false)

      if (!hasActive) {
        test.skip(true, 'No active sessions found')
        return
      }

      await activeSessionCard.click()
      await page.waitForLoadState('networkidle')

      await assertSingleCopyLinkBlock(page)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/04-session-detail-active-desktop.png`, fullPage: true })
    })

    test('session detail - closed', async ({ page }) => {
      if (!HAS_AUTH_STATE) {
        test.skip(true, 'No auth state - run: npx playwright codegen http://localhost:5173 --save-storage=playwright/.auth/state.json')
        return
      }

      await page.goto('/dashboard')

      const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
      if (isLogin) {
        test.skip(true, 'Auth state expired - regenerate with playwright codegen')
        return
      }

      const closedSessionCard = page.locator('text=Closed Sessions').locator('..').locator('button:has-text("Open details")').first()
      const hasClosed = await closedSessionCard.isVisible({ timeout: 3000 }).catch(() => false)

      if (!hasClosed) {
        test.skip(true, 'No closed sessions found')
        return
      }

      await closedSessionCard.click()
      await page.waitForLoadState('networkidle')

      await page.screenshot({ path: `${SCREENSHOT_DIR}/05-session-detail-closed-desktop.png`, fullPage: true })
    })
  })
})

test.describe('Golden Path - Profile (requires auth)', () => {
  test('profile setup - welcome back - mobile', async ({ page }) => {
    if (!HAS_AUTH_STATE) {
      test.skip(true, 'No auth state - run: npx playwright codegen http://localhost:5173 --save-storage=playwright/.auth/state.json')
      return
    }

    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard/profile')

    const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
    if (isLogin) {
      test.skip(true, 'Auth state expired - regenerate with playwright codegen')
      return
    }

    await page.waitForLoadState('networkidle')
    await assertNoHorizontalOverflow(page)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-profile-mobile.png`, fullPage: true })
  })

  test('profile setup - welcome back - desktop', async ({ page }) => {
    if (!HAS_AUTH_STATE) {
      test.skip(true, 'No auth state - run: npx playwright codegen http://localhost:5173 --save-storage=playwright/.auth/state.json')
      return
    }

    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/dashboard/profile')

    const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
    if (isLogin) {
      test.skip(true, 'Auth state expired - regenerate with playwright codegen')
      return
    }

    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-profile-desktop.png`, fullPage: true })
  })
})
