import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const SCREENSHOTS_DIR = path.join(process.cwd(), 'artifacts', 'screenshots')
const SESSION_SLUG = process.env.TEST_SESSION_SLUG || 'demo-session'

// Ensure screenshots directory exists
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

/**
 * UI Screenshot Suite
 *
 * Captures screenshots of key pages for visual verification.
 * Run with: TEST_SESSION_SLUG=your-slug npx playwright test -c playwright.screenshots.config.ts
 */

test.describe('Public Pages', () => {
  test('login page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-login-page.png'),
      fullPage: true,
    })
    expect(true).toBe(true)
  })

  test('participant feedback form', async ({ page }) => {
    await page.goto(`/s/${SESSION_SLUG}`)
    await page.waitForLoadState('networkidle')

    // Wait for content to load (either email entry or feedback form)
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-participant-access.png'),
      fullPage: true,
    })
    expect(true).toBe(true)
  })
})

test.describe('Authenticated Pages', () => {
  test.beforeEach(async () => {
    // Check if we have auth state - if not, these tests will show login page
    const authStatePath = path.join(process.cwd(), 'playwright', '.auth', 'state.json')
    if (!fs.existsSync(authStatePath)) {
      console.log('Note: No auth state found. Authenticated pages will show login redirect.')
    }
  })

  test('dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-dashboard.png'),
      fullPage: true,
    })
    expect(true).toBe(true)
  })

  test('session detail - overview tab', async ({ page }) => {
    // Find a session ID from dashboard or use a known one
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Try to click on a session card if available
    const sessionLink = page.locator('text=Open details').first()
    if (await sessionLink.isVisible()) {
      await sessionLink.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '04-session-detail-overview.png'),
        fullPage: true,
      })
    } else {
      // Take dashboard screenshot as fallback
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '04-session-detail-overview-fallback.png'),
        fullPage: true,
      })
    }
    expect(true).toBe(true)
  })

  test('session detail - results tab', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    const sessionLink = page.locator('text=Open details').first()
    if (await sessionLink.isVisible()) {
      await sessionLink.click()
      await page.waitForLoadState('networkidle')

      // Click on Results tab
      const resultsTab = page.locator('button:has-text("Results"), [role="tab"]:has-text("Results")')
      if (await resultsTab.isVisible()) {
        await resultsTab.click()
        await page.waitForTimeout(500)
      }

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '05-session-detail-results.png'),
        fullPage: true,
      })
    } else {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '05-session-detail-results-fallback.png'),
        fullPage: true,
      })
    }
    expect(true).toBe(true)
  })

  test('session detail - deck builder', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    const sessionLink = page.locator('text=Open details').first()
    if (await sessionLink.isVisible()) {
      await sessionLink.click()
      await page.waitForLoadState('networkidle')

      // Click on Results tab first
      const resultsTab = page.locator('button:has-text("Results"), [role="tab"]:has-text("Results")')
      if (await resultsTab.isVisible()) {
        await resultsTab.click()
        await page.waitForTimeout(500)
      }

      // Look for Deck Builder section
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '06-deck-builder.png'),
        fullPage: true,
      })
    } else {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '06-deck-builder-fallback.png'),
        fullPage: true,
      })
    }
    expect(true).toBe(true)
  })

  test('create session wizard', async ({ page }) => {
    await page.goto('/dashboard/sessions/new')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07-create-session-wizard.png'),
      fullPage: true,
    })
    expect(true).toBe(true)
  })

  test('profile page', async ({ page }) => {
    await page.goto('/dashboard/profile')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '08-profile.png'),
      fullPage: true,
    })
    expect(true).toBe(true)
  })
})
