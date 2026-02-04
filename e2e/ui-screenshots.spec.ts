import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

    test('login page - no overflow', async ({ page, context }) => {
      // Clear auth state for this test to see login page
      await context.clearCookies()

      // Navigate first, then clear localStorage
      await page.goto('/')
      await page.evaluate(() => {
        try { localStorage.clear() } catch { /* noop */ }
      })

      // Reload to apply cleared state
      await page.reload({ waitUntil: 'networkidle' })

      await expect(page.locator('text=Presentation Feedbacker')).toBeVisible({ timeout: 10000 })
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

    test('login page', async ({ page, context }) => {
      // Clear auth state for this test to see login page
      await context.clearCookies()

      await page.goto('/')
      await page.evaluate(() => {
        try { localStorage.clear() } catch { /* noop */ }
      })

      await page.reload({ waitUntil: 'networkidle' })

      await expect(page.locator('text=Presentation Feedbacker')).toBeVisible({ timeout: 10000 })
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

      // Wait for dashboard to load
      await page.waitForLoadState('networkidle')

      // Find first active session card and click
      const activeSessionCard = page.locator('button:has-text("Open details")').first()
      const hasActive = await activeSessionCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasActive) {
        test.skip(true, 'No active sessions found')
        return
      }

      await activeSessionCard.click()
      await page.waitForLoadState('networkidle')
      // Wait for actual content to load (not just the loading spinner)
      await page.waitForSelector('text=Dashboard', { timeout: 10000 })
      await page.waitForTimeout(500) // Brief pause for any animations

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

      // Wait for dashboard to load
      await page.waitForLoadState('networkidle')

      // Find a closed session card (in Closed Presentations section)
      const closedSection = page.locator('text=Closed Presentations').locator('..')
      const closedSessionCard = closedSection.locator('button:has-text("Open details")').first()
      const hasClosed = await closedSessionCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasClosed) {
        test.skip(true, 'No closed sessions found')
        return
      }

      await closedSessionCard.click()
      await page.waitForLoadState('networkidle')
      // Wait for actual content to load (not just the loading spinner)
      await page.waitForSelector('text=Dashboard', { timeout: 10000 })
      await page.waitForTimeout(500) // Brief pause for any animations

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

      // Wait for dashboard to load
      await page.waitForLoadState('networkidle')

      const activeSessionCard = page.locator('button:has-text("Open details")').first()
      const hasActive = await activeSessionCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasActive) {
        test.skip(true, 'No active sessions found')
        return
      }

      await activeSessionCard.click()
      await page.waitForLoadState('networkidle')
      // Wait for actual content to load (not just the loading spinner)
      await page.waitForSelector('text=Dashboard', { timeout: 10000 })
      await page.waitForTimeout(500) // Brief pause for any animations

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

      // Wait for dashboard to load
      await page.waitForLoadState('networkidle')

      // Find a closed session card (in Closed Presentations section)
      const closedSection = page.locator('text=Closed Presentations').locator('..')
      const closedSessionCard = closedSection.locator('button:has-text("Open details")').first()
      const hasClosed = await closedSessionCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasClosed) {
        test.skip(true, 'No closed sessions found')
        return
      }

      await closedSessionCard.click()
      await page.waitForLoadState('networkidle')
      // Wait for actual content to load (not just the loading spinner)
      await page.waitForSelector('text=Dashboard', { timeout: 10000 })
      await page.waitForTimeout(500) // Brief pause for any animations

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

test.describe('Golden Path - Deck Builder (requires auth)', () => {
  test('deck builder - initial state - mobile', async ({ page }) => {
    if (!HAS_AUTH_STATE) {
      test.skip(true, 'No auth state')
      return
    }

    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')

    const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
    if (isLogin) {
      test.skip(true, 'Auth state expired')
      return
    }

    await page.waitForLoadState('networkidle')

    // Click first session's Open details
    const detailsButton = page.locator('button:has-text("Open details")').first()
    const hasSession = await detailsButton.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasSession) {
      test.skip(true, 'No sessions found')
      return
    }

    await detailsButton.click()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=Dashboard', { timeout: 10000 })

    // Scroll to Deck Builder section
    const deckBuilder = page.locator('text=Deck Builder').first()
    await deckBuilder.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    // Screenshot the Deck Builder section
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-deck-builder-initial-mobile.png`, fullPage: true })
  })

  test('deck builder - success state - mobile', async ({ page }) => {
    if (!HAS_AUTH_STATE) {
      test.skip(true, 'No auth state')
      return
    }

    // This test needs a session with feedback and requires clicking "Analyze Responses"
    // which makes an API call. Skip if OPENAI_API_KEY is not available.
    const skipGeneration = process.env.SKIP_DECK_GENERATION === 'true'

    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')

    const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
    if (isLogin) {
      test.skip(true, 'Auth state expired')
      return
    }

    await page.waitForLoadState('networkidle')

    // Find a session with responses
    const detailsButton = page.locator('button:has-text("Open details")').first()
    const hasSession = await detailsButton.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasSession) {
      test.skip(true, 'No sessions found')
      return
    }

    await detailsButton.click()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=Dashboard', { timeout: 10000 })

    // Check if Analyze Responses button exists (means outline not generated yet)
    const analyzeButton = page.locator('button:has-text("Analyze Responses")')
    const hasAnalyzeButton = await analyzeButton.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasAnalyzeButton && !skipGeneration) {
      // Click to generate outline
      await analyzeButton.click()

      // Wait for generation (can take up to 30s)
      const outlineGenerated = await page.locator('text=Deck Title').isVisible({ timeout: 60000 }).catch(() => false)

      if (!outlineGenerated) {
        // Check for error state
        const errorState = await page.locator('text=Try again').isVisible({ timeout: 2000 }).catch(() => false)
        if (errorState) {
          await page.screenshot({ path: `${SCREENSHOT_DIR}/07-deck-builder-error-mobile.png`, fullPage: true })
          test.skip(true, 'Deck generation failed - captured error state')
          return
        }
        test.skip(true, 'Deck generation timed out')
        return
      }
    }

    // Check if we have a generated outline (either just generated or previously generated)
    const hasOutline = await page.locator('text=Deck Title').isVisible({ timeout: 3000 }).catch(() => false)
    if (!hasOutline) {
      test.skip(true, 'No outline available and SKIP_DECK_GENERATION=true')
      return
    }

    // Scroll to show the outline
    const deckTitle = page.locator('text=Deck Title').first()
    await deckTitle.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-deck-builder-success-mobile.png`, fullPage: true })
  })

  test('deck builder - desktop', async ({ page }) => {
    if (!HAS_AUTH_STATE) {
      test.skip(true, 'No auth state')
      return
    }

    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/dashboard')

    const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
    if (isLogin) {
      test.skip(true, 'Auth state expired')
      return
    }

    await page.waitForLoadState('networkidle')

    const detailsButton = page.locator('button:has-text("Open details")').first()
    const hasSession = await detailsButton.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasSession) {
      test.skip(true, 'No sessions found')
      return
    }

    await detailsButton.click()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('text=Dashboard', { timeout: 10000 })

    // Scroll to Deck Builder
    const deckBuilder = page.locator('text=Deck Builder').first()
    await deckBuilder.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-deck-builder-desktop.png`, fullPage: true })
  })
})

test.describe('Golden Path - Wizard Step 3 Topics (requires auth)', () => {
  test('step 3 - list first + inline edit', async ({ page }) => {
    if (!HAS_AUTH_STATE) {
      test.skip(true, 'No auth state')
      return
    }

    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard/sessions/new')
    await page.waitForLoadState('networkidle')

    const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
    if (isLogin) {
      test.skip(true, 'Auth state expired')
      return
    }

    // Dismiss restore prompt if it appears
    const startFresh = page.locator('button:has-text("Start fresh")')
    if (await startFresh.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startFresh.click()
      await page.waitForTimeout(500)
    }

    // Step 1: Fill title and length
    await page.fill('#title', 'AI and Machine Learning Overview')
    await page.fill('#lengthMinutes', '30')

    // Next → Step 2
    await page.locator('button:has-text("Next")').click()
    await page.waitForTimeout(500)

    // Step 2: Fill outline
    await page.fill('#summaryFull',
      'Introduction to AI and Machine Learning\n' +
      '- Neural network fundamentals\n' +
      '- Training and optimization\n\n' +
      'Transformer Architecture\n' +
      '- Attention mechanisms\n' +
      '- Self-attention vs cross-attention\n\n' +
      'Practical Applications\n' +
      '- Natural language processing\n' +
      '- Computer vision'
    )

    // Next → Step 3
    await page.locator('button:has-text("Next")').click()
    await page.waitForTimeout(1000)

    // Screenshot 1: List-first view with "Add topic" button
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-step3-list-first.png`, fullPage: true })

    // Click Edit on first topic → inline editor
    const editBtn = page.locator('button:has-text("Edit")').first()
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click()
      await page.waitForTimeout(300)

      // Screenshot 2: Inline edit mode
      await page.screenshot({ path: `${SCREENSHOT_DIR}/08-step3-inline-edit.png`, fullPage: true })
    }
  })
})
