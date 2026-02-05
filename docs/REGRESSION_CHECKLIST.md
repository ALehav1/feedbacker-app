# Regression Checklist

**Purpose:** Run this checklist before every PR/commit to ensure frozen baseline remains stable.

---

## Automated Checks

### 1. Build
```bash
npm run build
```
**Expected:** Exit code 0, no TypeScript errors

### 2. Lint
```bash
npm run lint
```
**Expected:** 0 errors (warnings are acceptable if pre-existing)

---

## Manual Smoke Test

### 3. Auth Flow
- [ ] Visit homepage
- [ ] Enter email
- [ ] Receive magic link email
- [ ] Click magic link
- [ ] Redirect to `/auth/callback`
- [ ] Land on dashboard or profile setup
- [ ] iOS Chrome (non-incognito) loads latest build without persistent spinner (stale cache should not stick)

### 4. Session Creation
- [ ] Click "Create New Session"
- [ ] Fill out form (length, title, welcome, summaries)
- [ ] Submit
- [ ] Session appears in dashboard
- [ ] Session state is `draft`

### 5. State Transitions
- [ ] Click "Open Session" → state changes to `active`
- [ ] Click "Copy Link" → link copied to clipboard
- [ ] Click "Close Session" → confirm → state changes to `completed`
- [ ] Click "Archive Session" → confirm → state changes to `archived`

### 6. Participant Feedback
- [ ] Open `/s/:slug` link (or `/s/:slug?k=...` if tokenized) while session is `active`
- [ ] Select themes (👍/👎)
- [ ] Optional: enter suggested topics (one per line) + name/email
- [ ] Submit
- [ ] See "Thank you" message

### 7. Results View
- [ ] Navigate to session detail
- [ ] Click "Audience feedback" tab
- [ ] See Topic Prioritization first, then Participant suggestions
- [ ] Individual responses are collapsed under "Reference: Individual responses"
- [ ] Verify sorting: net desc, total desc, sort_order asc

### 8. Edit Session Flow
- [ ] Navigate to Session Detail → Edit Session
- [ ] Verify Edit Session loads without blank screen
- [ ] Modify a field → Save
- [ ] Verify changes saved (toast shown)

### 9. Edit Profile Exit Path
- [ ] Navigate to Dashboard → Profile
- [ ] In edit mode, verify "Back to Dashboard" button exists
- [ ] Click "Back to Dashboard" → lands on dashboard

### 10. Mobile Header (375px)
- [ ] Session Detail header: buttons stack vertically
- [ ] No horizontal scroll on any page
- [ ] All text wraps properly

### 11. Console Check
- [ ] Open browser DevTools console
- [ ] Verify: **Zero errors** during smoke test
- [ ] Warnings are acceptable if pre-existing

### 12. Multi-Participant Count Consistency
- [ ] Two participants submit to same active session
- [ ] Dashboard shows updated response count
- [ ] SessionDetail shows same count on first load (no tab toggle needed)
- [ ] Audience feedback tab shows all responses immediately

> **Quick method:** Use the DEV-only "Response Generator" panel in SessionDetail (only visible in dev mode for active sessions) to generate 2-3 responses, then verify counts are consistent.

### 13. UI/UX Screenshot Tests

**Setup (one-time):**
```bash
# Install Playwright browsers if not already installed
npx playwright install chromium
```

**For authenticated tests (optional):**
```bash
# Start dev server
npm run dev

# In another terminal, create auth state:
npx playwright codegen http://localhost:5173 --save-storage=playwright/.auth/state.json
# Log in via magic link in the browser, then close codegen
```

**Run screenshot tests:**
```bash
# Ensure dev server is running: npm run dev

# Run with dedicated config
npx playwright test --config playwright.screenshots.config.ts

# Or run specific test file
TEST_SESSION_SLUG=your-slug npx playwright test e2e/ui-screenshots.spec.ts
```

**Checklist:**
- [ ] Screenshots saved to `./artifacts/screenshots/`
- [ ] Mobile screenshots (375px): login, feedback pages
- [ ] Desktop screenshots (1024px): login, feedback pages
- [ ] No horizontal overflow at 375px (assertion enforced)
- [ ] Single "Copy link" block per page (assertion enforced)
- [ ] Auth tests skip cleanly if no `playwright/.auth/state.json` exists

> **Visual verification:** Compare screenshots against previous versions to catch layout regressions.
>
> **Note:** Auth tests will skip with a clear message if `playwright/.auth/state.json` doesn't exist. This is expected for CI or fresh environments.

### 14. SessionDetail Edit Button (Active Sessions)
- [ ] Open an active session's detail page
- [ ] Verify "Edit presentation" button is visible below participant link
- [ ] Click "Edit presentation" → lands on SessionEdit page

### 15. Deck Builder (AI Behavior)
- [ ] Open a completed session with responses
- [ ] Click "Generate final outline" in Deck Builder panel
- [ ] Verify outline generates with interest labels (high/low/neutral)
- [ ] Verify "Generate PowerPoint" produces downloadable .pptx
- [ ] Run `npm run test:deck-equivalence` — structural equivalence confirmed

### 16. Environment Variable Consistency
- [ ] Verify `VITE_APP_URL` is set in `.env` (preferred)
- [ ] Fallback to `VITE_PUBLIC_BASE_URL` or `window.location.origin` works
- [ ] Participant links display correctly in Dashboard and SessionDetail

---

## Pass Criteria

✅ **All automated checks pass**  
✅ **All manual smoke tests pass**  
✅ **Zero console errors**

---

## When to Run

- Before every commit
- After merging branches
- Before deploying to production
- After adding new dependencies
- After modifying frozen baseline files (requires extra scrutiny)

---

## Failure Protocol

If any check fails:
1. **Stop immediately** — do not commit
2. **Identify root cause** — check diff, logs, console
3. **Fix minimally** — smallest possible change
4. **Re-run full checklist** — verify fix didn't break something else
5. **Document in BASELINE_LOCK.md** if frozen file was modified
