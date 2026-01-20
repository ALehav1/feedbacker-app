# Baseline Lock

**Status:** Active  
**Locked Date:** January 18, 2026  
**Commit Hash:** `0613cd18f5ddc1aadaf4aebf7a707819bf2f0ad6`

---

## Purpose

This document defines the **frozen baseline** for the Feedbacker app. These modules are considered stable and complete. Changes are allowed **only** if fixing a confirmed bug, addressing a security gap, or responding to a failing test.

---

## Frozen Areas

### 1. Auth Flow
- Magic link sign-in
- AuthCallback routing
- AuthContext session persistence
- **Presenter ID invariant:** `presenters.id === auth.uid()`

**Frozen Files:**
- `src/features/auth/AuthContext.tsx`
- `src/features/auth/AuthCallback.tsx`
- `src/features/auth/ProtectedRoute.tsx`

### 2. Supabase Client
- Singleton behavior
- HMR-safe initialization
- Navigator Lock workaround (disabled in dev)

**Frozen Files:**
- `src/lib/supabase.ts`

### 3. Routing Boundaries
**Public routes:**
- `/` (homepage)
- `/auth/callback` (magic link handler)
- `/s/:slug` (participant feedback form)

**Protected routes:**
- `/dashboard` (presenter dashboard)
- `/dashboard/profile` (profile setup)
- `/dashboard/sessions/new` (session creation)
- `/dashboard/sessions/:id` (session detail)

**Frozen Files:**
- `src/App.tsx`

### 4. Session State Machine
**States:** `draft → active → completed → archived`

**Enforcement:**
- Participant submission allowed **only** when `state === 'active'`
- Draft shows "Session Not Open Yet"
- Completed/archived show "Session Closed"

**Defense-in-Depth Note:**
Application enforces active-only submission; RLS policies are currently permissive across non-archived states (`active`, `completed`) as a secondary guardrail and to preserve operational flexibility during MVP iteration. The application layer (`FeedbackForm.tsx`) is the primary enforcement mechanism.

**Frozen Files:**
- `src/features/sessions/SessionDetail.tsx` (state transitions)
- `src/features/participant/FeedbackForm.tsx` (state validation)

### 5. Participant Submission Semantics
- Theme selection: `more | less | neutral`
- Neutral means **no row exists** in `theme_selections`
- **Invariant:** At most one selection row per `(response_id, theme_id)`

**Frozen Files:**
- `src/features/participant/FeedbackForm.tsx`
- `src/components/ThemeSelector.tsx`

### 6. Results Aggregation
**Sort order:** `net DESC, total DESC, sort_order ASC`

**Components:**
- Theme leaderboard with counts and bar visualization
- Response list with participant info and free-form text

**Frozen Files:**
- `src/features/sessions/SessionDetail.tsx` (Results tab)

### 7. Database Schema + RLS
**Do not alter** schema or policies unless fixing a concrete bug.

**Frozen Files:**
- `supabase/schema.sql`
- `supabase/rls-policies.sql`

---

## Change Policy

**Frozen Code Set:** All files marked with `BASELINE_LOCK` header comment

**Allowed Changes:**
1. **Documentation (anytime):** Changes to `docs/` do not require exception logging
2. **Route wiring (src/App.tsx only):** Route additions/changes must be logged under "Exceptions" section
3. **Frozen file logic changes:** Require dedicated "Baseline Exception" entry + commit prefix `chore(baseline-exception): ...`

**Exception Requirements:**
1. **Specific bug reference** (error message, reproduction steps) OR feature justification
2. **Minimal diff** (smallest possible change)
3. **Documentation update** in this file under "Exceptions" section

**No refactors allowed:**
- No file moves
- No renames
- No library changes
- No "cleanup passes"

---

## Exceptions

### Routing Wiring (January 18, 2026)

**File:** `src/App.tsx`
**Change:** Updated `/dashboard/sessions/new` route to use `SessionCreateWizard` instead of `SessionCreate`
**Justification:** Feature wiring for session creation wizard. Routing changes must occur in App.tsx by architectural necessity.
**Scope:** Import statement changed (line 15), component reference changed (line 48). No other logic modified.
**Commit:** `2fb95b2521d8de1e32883a2397bd843598a31c61`

### Auth Log Spam Fix (January 19, 2026)

**File:** `src/features/auth/AuthContext.tsx`
**Change:** Filter onAuthStateChange log messages to only show significant events (SIGNED_IN, SIGNED_OUT)
**Justification:** Bug fix - excessive console logging from TOKEN_REFRESHED events causing log spam
**Scope:** Added conditional check before console.log (line 111-114). No logic change to auth flow.
**Bug:** Supabase fires TOKEN_REFRESHED events periodically, causing repeated auth state logs
**Commit:** `0ce21d0`

### Auth Callback Race Condition Fix (January 19, 2026)

**File:** `src/features/auth/AuthCallback.tsx`
**Change:** Wait for user to be set when URL contains auth tokens before navigating
**Justification:** Bug fix - returning presenters redirected to profile page instead of dashboard
**Scope:** Added `hasAuthToken` check and `user` dependency to wait for magic link processing
**Bug:** `getSessionWithRetry()` sets `isLoading=false` before Supabase processes magic link token in URL. AuthCallback then navigates with `presenter=null` because the session hasn't been established yet.
**Reproduction:** Click magic link → lands on profile page instead of dashboard
**Commit:** `c5384bb`

### LoginPage Auth Redirect (January 19, 2026)

**File:** `src/features/auth/LoginPage.tsx`
**Change:** Redirect authenticated users to dashboard instead of showing login form
**Justification:** Bug fix - users with valid sessions had to re-enter email and request new magic link
**Scope:** Added useEffect to redirect authenticated users, added loading state
**Bug:** LoginPage showed login form even when user had valid session in localStorage
**Reproduction:** Have valid session → visit `/` → had to re-enter email instead of auto-redirect
**Commit:** `c5384bb`

### UI Copy Clarity (January 19, 2026 10:32 AM)

**Files:**
- `src/features/participant/FeedbackForm.tsx`
- `src/features/sessions/SessionDetail.tsx`
- `src/components/ThemeSelector.tsx`

**Change:** Update copy and labels to clarify participant semantics (cover more vs cover less)

**Justification:** UX improvement - eliminate ambiguity in participant intent. Replace "themes" with "topics", replace 👍/👎 with explicit "Cover more"/"Cover less" labels, clarify tab names.

**Scope:** Copy + labels only; no logic changes
- FeedbackForm: Card title, description, theme→topic labels, validation message (4 strings)
- SessionDetail: Tab names "Details"→"Session details", "Results"→"Audience feedback", header "Theme Results"→"Topic Results" (3 strings)
- ThemeSelector: Button labels 👍/👎 → "Cover more"/"Cover less" (2 strings)

**Commit:** `10e757b`

### Expired Magic Link UX (January 19, 2026)

**File:** `src/features/auth/AuthCallback.tsx`
**Change:** Detect `error_code=otp_expired` and show user-friendly message with action button
**Justification:** UX improvement - expired/used magic links showed generic error and auto-redirected without explanation
**Scope:** Added `isExpiredLink` parsing, conditional rendering for expired links, Button import
**Behavior:**
- Title: "Sign-in link expired"
- Body: "This link expired or was already used. Request a new one."
- Button: "Send me a new link" → navigates to `/`
- No auto-redirect for expired links (user must click button)
**Commit:** `a1c2f3c`

### Participant Overview + Instructions (January 20, 2026)

**File:** `src/features/participant/FeedbackForm.tsx`
**Change:** Restructure participant page to show overview summary and explicit instructions
**Justification:** Feature requirement - presenter provides curated overview for participants, clear instructions section
**Scope:** Copy-only changes, zero logic modifications
- Show `session.summaryCondensed` only (removed fallback to `summaryFull`)
- Added "Instructions" section with explicit copy
- Moved session length under Instructions
- Changed "About this session" → removed section header, overview shows in gray box
- Changed "Topics in this talk" → "Topics"
- Changed "No themes available" → "No topics available"
**Lines modified:** 311-342 (CardContent structure)
**Diff size:** ~20 lines
**Commit:** `f3e9503`

### Canonical Base URL for Share Links (January 20, 2026)

**File:** `src/features/sessions/SessionDetail.tsx`
**Change:** Use canonical base URL for share link display and copying
**Justification:** Feature requirement - prevent multi-domain confusion when old vercel domain is accessed
**Scope:** URL display only, zero logic changes
- Added `const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin`
- Updated `handleCopyLink` to use `baseUrl` instead of `window.location.origin`
- Updated shareable link display to show `baseUrl` instead of `window.location.origin`
**Lines modified:** 73, 186, 417 (URL construction + display)
**Diff size:** 3 lines
**Commit:** Pending

---

## Baseline Lock History

### Pre-Freeze State (January 18, 2026)

**Commit Hash:** `0613cd18f5ddc1aadaf4aebf7a707819bf2f0ad6`

**Verification Steps:**
1. ✅ `npm run build` — Passing
2. ✅ `npm run lint` — 0 errors, 3 warnings (Fast Refresh - non-blocking)
3. ✅ Manual smoke test:
   - Login with magic link
   - Create session
   - Open session (draft → active)
   - Participant submit feedback
   - View results tab
   - Close session (active → completed)
   - Archive session (completed → archived)
4. ✅ Console: Zero runtime errors

**Test Date:** January 18, 2026 10:12 PM UTC-5

---

### Baseline Lock Implementation (January 18, 2026)

**Commit 1:** `cd173b7` — `chore: baseline lock + regression checklist`
- Documentation: BASELINE_LOCK.md, REGRESSION_CHECKLIST.md, SMOKE_TEST_RESULTS.md
- BASELINE_LOCK headers: 8 frozen files (no logic changes)

**Commit 2:** `2fb95b2` — `feat: session creation wizard`
- New file: SessionCreateWizard.tsx (657 lines)
- Routing: App.tsx (import + route updated)
- Documentation: TESTING.md (wizard test cases)

**Commit 3:** `727d51f` — `docs: add commit hashes to BASELINE_LOCK.md`
- Documentation: BASELINE_LOCK.md (commit hashes added)

**Frozen Code Set Established:** All files with BASELINE_LOCK header comment as of commit `727d51f`

---

## Change Log

| Date | File | Reason | Commit |
|------|------|--------|--------|
| Jan 19, 2026 | AuthCallback.tsx | Race condition fix - wait for magic link processing | `c5384bb` |
| Jan 19, 2026 | LoginPage.tsx | Redirect authenticated users to dashboard | `c5384bb` |

---

## Next Build Phase

**Focus:** Session Creation Wizard (multi-step, save at end)

**Constraint:** Must not modify frozen baseline unless absolutely necessary.
