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

---

## Bug Fixes — January 19, 2026

### Bug 1: SIGNED_IN Log Spam

**Symptom:** Console shows repeated "[Auth] onAuthStateChange: SIGNED_IN has session" logs

**Reproduction:**
1. Login with magic link
2. Wait on any authenticated page
3. Observe console - logs appear on every TOKEN_REFRESHED event

**Root Cause:** Supabase fires multiple auth events (SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, etc.). The console.log in AuthContext.tsx logged all events indiscriminately.

**Fix:** Filter log messages to only show significant events (SIGNED_IN, SIGNED_OUT). TOKEN_REFRESHED and other internal events are no longer logged.

**Files Changed:**
- `src/features/auth/AuthContext.tsx` (lines 111-114) - baseline exception

**Verification:**
1. Login with magic link
2. Wait 30+ seconds on authenticated page
3. Observe console - only see SIGNED_IN once, no TOKEN_REFRESHED spam

---

### Bug 2: Session Creation 400 Error

**Symptom:** Creating a session via wizard returns HTTP 400 from Supabase

**Reproduction:**
1. Login and navigate to /dashboard/sessions/new
2. Fill out Step 1 (length + title)
3. Leave Step 2 fields empty (welcome message, summaries)
4. Complete wizard and click Create Session
5. Error: "Creation failed"

**Root Cause:** Schema defines `welcome_message`, `summary_full`, `summary_condensed` as `NOT NULL DEFAULT ''`. The wizard code passed `null` for empty fields (`|| null`), which violates the NOT NULL constraint.

**Fix:** Pass empty string instead of null for NOT NULL fields.

**Files Changed:**
- `src/features/sessions/SessionCreateWizard.tsx` (lines 211-215)
- `src/types/index.ts` (Session interface - removed nullable types)
- `src/hooks/useSessions.ts` (SessionRow type alignment)

**Verification:**
1. Create session with only required fields (length + title)
2. Session creates successfully
3. Check Supabase: empty string fields (not NULL)

---

### Bug 3: Returning Presenter Flow

**Symptom:** Edit Profile page shows blank form for existing users instead of pre-populating

**Root Cause:** ProfileSetup component didn't pre-populate form fields when editing existing presenter profile.

**Fix:** Added useEffect to initialize form with existing presenter data when available. Also updated UI text to show "Edit Profile" vs "Complete Your Profile" based on context.

**Files Changed:**
- `src/features/presenter/ProfileSetup.tsx`

**Verification:**
1. Create presenter profile
2. Go to Dashboard → Click "Edit Profile"
3. Form shows existing name and organization
4. Title shows "Edit Profile"
5. Button shows "Save Changes"

---

## Supabase Dashboard Verification Checklist

After running smoke tests, verify in Supabase dashboard:

| Check | Expected | Actual |
|-------|----------|--------|
| Auth Users | Only one user for test email | ⬜ |
| presenters table | One row with id = auth.uid() | ⬜ |
| sessions table | Created sessions visible | ⬜ |
| themes table | Themes with correct sort_order (1-indexed) | ⬜ |
| No partial data | No orphaned rows from failed inserts | ⬜ |
