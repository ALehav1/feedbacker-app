import { test, expect } from '@playwright/test'

/**
 * UI Screenshot Test Suite
 *
 * Captures screenshots at mobile (375px) and desktop (1024px) viewports
 * for visual verification of UI consistency.
 *
 * These tests can run without authentication for public pages.
 * Authenticated pages will be skipped if not logged in.
 *
 * Screenshots are saved to: ./artifacts/screenshots/
 *
 * Run with: npx playwright test e2e/ui-screenshots.spec.ts
 */

const SCREENSHOT_DIR = './artifacts/screenshots'

test.describe('UI Screenshots - Mobile (375px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
  })

  test('login page', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Presentation Feedbacker')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/login-mobile.png`, fullPage: true })
  })

  test('feedback form - session not found', async ({ page }) => {
    await page.goto('/s/nonexistent-session-slug')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/feedback-not-found-mobile.png`, fullPage: true })
  })
})

test.describe('UI Screenshots - Desktop (1024px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
  })

  test('login page', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Presentation Feedbacker')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/login-desktop.png`, fullPage: true })
  })

  test('feedback form - session not found', async ({ page }) => {
    await page.goto('/s/nonexistent-session-slug')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/feedback-not-found-desktop.png`, fullPage: true })
  })
})

test.describe('UI Screenshots - Dashboard (requires auth)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
  })

  test('dashboard - mobile', async ({ page }) => {
    await page.goto('/dashboard')

    // Check if redirected to login (not authenticated)
    const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
    if (isLogin) {
      test.skip(true, 'Not authenticated - skipping dashboard screenshot')
      return
    }

    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard-mobile.png`, fullPage: true })
  })

  test('dashboard - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/dashboard')

    const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
    if (isLogin) {
      test.skip(true, 'Not authenticated - skipping dashboard screenshot')
      return
    }

    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard-desktop.png`, fullPage: true })
  })
})

test.describe('UI Screenshots - Profile Setup (requires auth)', () => {
  test('profile setup - welcome back', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard/profile')

    const isLogin = await page.locator('text=Send magic link').isVisible({ timeout: 3000 }).catch(() => false)
    if (isLogin) {
      test.skip(true, 'Not authenticated - skipping profile screenshot')
      return
    }

    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${SCREENSHOT_DIR}/profile-mobile.png`, fullPage: true })
  })
})
