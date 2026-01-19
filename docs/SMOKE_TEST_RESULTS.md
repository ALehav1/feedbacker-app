# Smoke Test Results

## Wizard Smoke Test — January 18, 2026

**Tester:** (Your name)  
**Environment:** Local dev (http://localhost:5173)  
**Baseline Commit:** `0613cd18f5ddc1aadaf4aebf7a707819bf2f0ad6`  
**Wizard Commit:** `2fb95b2521d8de1e32883a2397bd843598a31c61`

---

## Automated/Local Verification

**Run Date:** January 18, 2026 10:26 PM UTC-5  
**Commits Verified:** `cd173b7`, `2fb95b2`, `727d51f`

| Test | Result | Details |
|------|--------|---------|
| `npm run build` | ✅ PASS | 0 errors, bundle size warning (expected) |
| `npm run lint` | ✅ PASS | 0 errors, 3 warnings (Fast Refresh - pre-existing) |
| `npm run preview` | ✅ PASS | Server started on http://localhost:4173/ |
| `curl /` (root) | ✅ PASS | HTTP 200, HTML served |
| `curl /s/test-slug` | ✅ PASS | HTTP 200, SPA routing works |

**Conclusion:** All automated checks passing. App builds, lints clean, and preview server responds correctly.

---

## Manual UI Smoke Tests (Presenter/Participant)

**Status:** ⬜ PENDING USER ACTION

### Auth Flow

| Test | Result | Notes |
|------|--------|-------|
| Magic link login | ⬜ PENDING | Enter email → receive email → click link → redirect |
| New user → profile setup | ⬜ PENDING | First login redirects to /dashboard/profile |
| Returning user → dashboard | ⬜ PENDING | Subsequent logins go to /dashboard |
| Page refresh (soft) | ⬜ PENDING | F5 maintains auth state |
| Hard refresh | ⬜ PENDING | Cmd+Shift+R maintains auth state |
| Sign out | ⬜ PENDING | Session cleared, redirects to / |

---

### Presenter: Wizard Session Creation

| Test | Result | Notes |
|------|--------|-------|
| Wizard loads | ⬜ PENDING | Navigate to /dashboard/sessions/new |
| Step 1 validation | ⬜ PENDING | Click Next without fields → shows errors |
| Step 1 complete | ⬜ PENDING | Enter length + title → Next → advances to Step 2 |
| Step 2 optional fields | ⬜ PENDING | Can skip all fields and advance |
| Step 3 add theme | ⬜ PENDING | Add theme → appears in list with sort_order |
| Step 3 reorder themes | ⬜ PENDING | Use ↑↓ buttons to reorder |
| Step 3 edit theme | ⬜ PENDING | Edit → Save updates theme text |
| Step 3 delete theme | ⬜ PENDING | Delete removes theme, renumbers remaining |
| Step 4 review | ⬜ PENDING | Shows all entered data correctly |
| Back navigation | ⬜ PENDING | Can go back through steps, data persists |
| localStorage persistence | ⬜ PENDING | Fill Step 1-2 → refresh → data restored |
| Create session | ⬜ PENDING | Click Create → session + themes saved to DB |
| Verify DB write | ⬜ PENDING | Check Supabase: session in draft, themes with correct sort_order |
| Exit wizard | ⬜ PENDING | Click Exit → confirm → returns to dashboard |

---

### Presenter: Session State Management

| Test | Result | Notes |
|------|--------|-------|
| Open session (draft → active) | ⬜ PENDING | Click Open Session button → state updates |
| Copy link | ⬜ PENDING | Click Copy Link → clipboard has /s/:slug |
| Close session (active → completed) | ⬜ PENDING | Click Close → confirm → state updates |
| Archive session (completed → archived) | ⬜ PENDING | Click Archive → confirm → state updates |

---

### Participant: Feedback Submission

| Test | Result | Notes |
|------|--------|-------|
| Draft session blocked | ⬜ PENDING | Visit /s/:slug for draft → "Not open yet" |
| Active session accessible | ⬜ PENDING | Visit /s/:slug for active → shows form |
| Completed/archived blocked | ⬜ PENDING | Visit /s/:slug → "Session closed" |
| Submit with themes | ⬜ PENDING | Select 👍/👎 → submit → "Thank you" |
| Email validation | ⬜ PENDING | Invalid email → shows error |
| Dedupe behavior | ⬜ PENDING | Submit → reload page → form hidden (localStorage token) |

---

### Results View

| Test | Result | Notes |
|------|--------|-------|
| Results tab loads | ⬜ PENDING | Click Results tab → shows aggregated data |
| Theme counts correct | ⬜ PENDING | Manual count matches UI counts |
| Sorting correct | ⬜ PENDING | Themes sorted by net desc, total desc, sort_order asc |
| Response list correct | ⬜ PENDING | All participant responses appear with correct data |

---

### Console Checks

| Test | Result | Notes |
|------|--------|-------|
| Zero errors during wizard | ⬜ PENDING | DevTools console has no errors |
| Zero errors during submission | ⬜ PENDING | DevTools console has no errors |
| Zero errors during results view | ⬜ PENDING | DevTools console has no errors |

---

## Summary

**Total Tests:** 40  
**Passed:** 0  
**Failed:** 0  
**Pending:** 40

**Status:** ⬜ NOT YET TESTED

**Notes:**  
Manual smoke test must be run by user. Cascade cannot interact with browser UI.

---

## Instructions for Running Smoke Test

1. Start dev server: `npm run dev`
2. Open http://localhost:5173 in browser
3. Work through each test in order
4. Mark ✅ PASS or ❌ FAIL for each test
5. Record any notes about failures
6. Update Summary section with final counts
