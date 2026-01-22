import { test, expect, BrowserContext, Page } from '@playwright/test'

/**
 * Multi-Participant E2E Test
 *
 * This test validates that the app correctly handles multiple participant responses:
 * - Dashboard response count matches SessionDetail response count
 * - Audience feedback list shows all responses immediately
 * - Results aggregation reflects multiple responses
 * - Refresh and navigation do not change counts or drop responses
 * - No duplicate responses after refresh
 *
 * Prerequisites:
 * 1. Dev server running: npm run dev
 * 2. An active session with topics exists
 * 3. You must set TEST_SESSION_SLUG env var to the session slug
 *    Example: TEST_SESSION_SLUG=abc123 npx playwright test
 *
 * Alternatively, use the DEV seed button in SessionDetail to generate responses
 * and manually verify the assertions.
 */

// Test configuration
const SESSION_SLUG = process.env.TEST_SESSION_SLUG || 'test-session'
const BASE_URL = 'http://localhost:5173'

test.describe('Multi-Participant Response Handling', () => {
  // Each test gets fresh browser contexts for participants
  let participantContextA: BrowserContext
  let participantContextB: BrowserContext
  let participantPageA: Page
  let participantPageB: Page

  test.beforeEach(async ({ browser }) => {
    // Create two separate browser contexts (like two different users)
    participantContextA = await browser.newContext()
    participantContextB = await browser.newContext()
    participantPageA = await participantContextA.newPage()
    participantPageB = await participantContextB.newPage()
  })

  test.afterEach(async () => {
    await participantContextA.close()
    await participantContextB.close()
  })

  test('two participants can submit responses and presenter sees both immediately', async ({
    page: presenterPage,
  }) => {
    const participantUrl = `${BASE_URL}/s/${SESSION_SLUG}`
    const timestamp = Date.now()

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Participant A submits response
    // ═══════════════════════════════════════════════════════════════════════════
    await test.step('Participant A submits response', async () => {
      await participantPageA.goto(participantUrl)

      // Wait for page to load and show topics
      await expect(participantPageA.locator('h3:has-text("Topics")')).toBeVisible({
        timeout: 10000,
      })

      // Select at least one topic (click "Cover more" on first topic)
      const firstCoverMoreBtn = participantPageA
        .locator('button:has-text("Cover more")')
        .first()
      await expect(firstCoverMoreBtn).toBeVisible()
      await firstCoverMoreBtn.click()

      // Fill optional info
      await participantPageA.fill(
        'input#participantName',
        `Test Participant A (${timestamp})`
      )
      await participantPageA.fill(
        'input#participantEmail',
        `test-a-${timestamp}@example.com`
      )
      await participantPageA.fill(
        'textarea#freeform',
        `Test feedback from Participant A - ${timestamp}`
      )

      // Submit
      await participantPageA.click('button:has-text("Submit Feedback")')

      // Verify submission success
      await expect(participantPageA.locator('text=Thank You!')).toBeVisible({
        timeout: 10000,
      })
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Participant B submits response (different selections)
    // ═══════════════════════════════════════════════════════════════════════════
    await test.step('Participant B submits response', async () => {
      await participantPageB.goto(participantUrl)

      // Wait for page to load
      await expect(participantPageB.locator('h3:has-text("Topics")')).toBeVisible({
        timeout: 10000,
      })

      // Select different topics - click "Cover less" on first, "Cover more" on second
      const coverLessBtn = participantPageB
        .locator('button:has-text("Cover less")')
        .first()
      await expect(coverLessBtn).toBeVisible()
      await coverLessBtn.click()

      // Try to select a second topic if available
      const coverMoreButtons = participantPageB.locator('button:has-text("Cover more")')
      const count = await coverMoreButtons.count()
      if (count > 0) {
        // Click the last available "Cover more" button
        await coverMoreButtons.last().click()
      }

      // Fill optional info
      await participantPageB.fill(
        'input#participantName',
        `Test Participant B (${timestamp})`
      )
      await participantPageB.fill(
        'input#participantEmail',
        `test-b-${timestamp}@example.com`
      )
      await participantPageB.fill(
        'textarea#freeform',
        `Test feedback from Participant B - ${timestamp}`
      )

      // Submit
      await participantPageB.click('button:has-text("Submit Feedback")')

      // Verify submission success
      await expect(participantPageB.locator('text=Thank You!')).toBeVisible({
        timeout: 10000,
      })
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: Presenter views SessionDetail - verify immediate visibility
    // ═══════════════════════════════════════════════════════════════════════════
    await test.step('Presenter sees both responses immediately', async () => {
      // Note: This step requires the presenter to be logged in
      // The test assumes auth cookies/storage are already set up
      // In CI, this would need session mocking or a test user login flow

      // Navigate to dashboard first
      await presenterPage.goto(`${BASE_URL}/dashboard`)

      // If not logged in, this will redirect to login
      // For now, we check if we can see dashboard content
      const isDashboard = await presenterPage
        .locator('text=Dashboard')
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (!isDashboard) {
        test.skip(
          true,
          'Presenter not logged in - run test after manual login or configure test auth'
        )
        return
      }

      // Find the session card and click to open
      // Look for a session that contains our test slug
      const sessionCard = presenterPage.locator(`text=${SESSION_SLUG}`).first()
      const hasSession = await sessionCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasSession) {
        // Try clicking "Session details" button if visible
        const detailsBtn = presenterPage
          .locator('button:has-text("Session details")')
          .first()
        if (await detailsBtn.isVisible().catch(() => false)) {
          await detailsBtn.click()
        } else {
          test.skip(true, `Session with slug ${SESSION_SLUG} not found in dashboard`)
          return
        }
      } else {
        // Click on session card to open SessionDetail
        await sessionCard.click()
      }

      // Wait for SessionDetail to load
      await expect(presenterPage.locator('text=Audience feedback')).toBeVisible({
        timeout: 10000,
      })

      // Click on Audience feedback tab
      await presenterPage.click('button:has-text("Audience feedback")')

      // ═══════════════════════════════════════════════════════════════════════
      // ASSERTION 1: Both responses appear in list
      // ═══════════════════════════════════════════════════════════════════════
      const participantAName = presenterPage.locator(
        `text=Test Participant A (${timestamp})`
      )
      const participantBName = presenterPage.locator(
        `text=Test Participant B (${timestamp})`
      )

      await expect(participantAName).toBeVisible({ timeout: 10000 })
      await expect(participantBName).toBeVisible({ timeout: 10000 })

      // ═══════════════════════════════════════════════════════════════════════
      // ASSERTION 2: Response count is correct (at least 2)
      // ═══════════════════════════════════════════════════════════════════════
      const responseCountText = presenterPage.locator('text=/\\d+ responses/')
      await expect(responseCountText).toBeVisible()

      // Extract count and verify it's at least 2
      const countText = await responseCountText.textContent()
      const countMatch = countText?.match(/(\d+) responses?/)
      const count = countMatch ? parseInt(countMatch[1], 10) : 0
      expect(count).toBeGreaterThanOrEqual(2)

      // ═══════════════════════════════════════════════════════════════════════
      // ASSERTION 3: Aggregation shows votes from both participants
      // ═══════════════════════════════════════════════════════════════════════
      // Check that topic prioritization section exists and has data
      const topicPrioritization = presenterPage.locator('text=Topic Prioritization')
      await expect(topicPrioritization).toBeVisible()

      // Verify we see vote counts (thumbs up/down indicators)
      const thumbsUp = presenterPage.locator('text=/👍 \\d+/')
      await expect(thumbsUp.first()).toBeVisible()
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: Refresh and verify stability
    // ═══════════════════════════════════════════════════════════════════════════
    await test.step('Refresh preserves counts and responses', async () => {
      // Get current count before refresh
      const beforeRefreshCount = await presenterPage
        .locator('text=/\\d+ responses/')
        .textContent()

      // Hard refresh
      await presenterPage.reload()

      // Wait for page to load
      await expect(presenterPage.locator('text=Audience feedback')).toBeVisible({
        timeout: 10000,
      })

      // Click on Audience feedback tab again
      await presenterPage.click('button:has-text("Audience feedback")')

      // ═══════════════════════════════════════════════════════════════════════
      // ASSERTION 4: Count is same after refresh
      // ═══════════════════════════════════════════════════════════════════════
      const afterRefreshCount = await presenterPage
        .locator('text=/\\d+ responses/')
        .textContent()
      expect(afterRefreshCount).toBe(beforeRefreshCount)

      // ═══════════════════════════════════════════════════════════════════════
      // ASSERTION 5: Both responses still visible (no duplicates, no missing)
      // ═══════════════════════════════════════════════════════════════════════
      const participantAName = presenterPage.locator(
        `text=Test Participant A (${timestamp})`
      )
      const participantBName = presenterPage.locator(
        `text=Test Participant B (${timestamp})`
      )

      await expect(participantAName).toBeVisible()
      await expect(participantBName).toBeVisible()

      // Check for duplicates - each name should appear exactly once
      const aCount = await participantAName.count()
      const bCount = await participantBName.count()
      expect(aCount).toBe(1)
      expect(bCount).toBe(1)
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 5: Tab stability - verify no hidden fetch ordering bug
    // ═══════════════════════════════════════════════════════════════════════════
    await test.step('Tab switching does not fix or break response visibility', async () => {
      // Switch to Session details tab
      await presenterPage.click('button:has-text("Session details")')
      await expect(presenterPage.locator('text=Welcome message')).toBeVisible()

      // Switch back to Audience feedback
      await presenterPage.click('button:has-text("Audience feedback")')

      // Responses should still be visible without needing tab switch to "fix" them
      const participantAName = presenterPage.locator(
        `text=Test Participant A (${timestamp})`
      )
      await expect(participantAName).toBeVisible({ timeout: 5000 })

      // Count should remain stable
      const responseCountText = presenterPage.locator('text=/\\d+ responses/')
      const countText = await responseCountText.textContent()
      const countMatch = countText?.match(/(\d+) responses?/)
      const count = countMatch ? parseInt(countMatch[1], 10) : 0
      expect(count).toBeGreaterThanOrEqual(2)
    })
  })
})

/**
 * Regression trap test - specifically guards against the bug:
 * "Dashboard shows 1 response but SessionDetail shows 0 until you click tabs"
 *
 * This test is designed to catch fetch ordering/timing bugs where counts
 * are inconsistent between views.
 */
test.describe('Regression: Count Consistency', () => {
  test('dashboard count equals detail page count on first load', async ({ page }) => {
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`)

    // Check if logged in
    const isDashboard = await page
      .locator('text=Dashboard')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (!isDashboard) {
      test.skip(true, 'Not logged in - skipping count consistency test')
      return
    }

    // Find session card with responses
    const responseIndicator = page.locator('text=/\\d+ responses?/').first()
    const hasResponses = await responseIndicator
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (!hasResponses) {
      test.skip(true, 'No sessions with responses found')
      return
    }

    // Get dashboard count
    const dashboardCountText = await responseIndicator.textContent()
    const dashboardMatch = dashboardCountText?.match(/(\d+) responses?/)
    const dashboardCount = dashboardMatch ? parseInt(dashboardMatch[1], 10) : 0

    // Click to open session detail
    const sessionCard = page.locator('button:has-text("Session details")').first()
    await sessionCard.click()

    // Wait for detail page
    await expect(page.locator('text=Audience feedback')).toBeVisible({ timeout: 10000 })

    // Click Audience feedback tab
    await page.click('button:has-text("Audience feedback")')

    // Get detail page count
    const detailCountElement = page.locator('text=/\\d+ responses/').first()
    await expect(detailCountElement).toBeVisible({ timeout: 5000 })
    const detailCountText = await detailCountElement.textContent()
    const detailMatch = detailCountText?.match(/(\d+) responses?/)
    const detailCount = detailMatch ? parseInt(detailMatch[1], 10) : 0

    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL ASSERTION: Dashboard count MUST equal Detail page count
    // This catches the "shows X on dashboard but 0 on detail until tab switch" bug
    // ═══════════════════════════════════════════════════════════════════════════
    expect(detailCount).toBe(dashboardCount)
  })
})
