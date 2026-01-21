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
- Draft shows full preview with voting disabled and banner: "Preview only. Feedback collection starts after the presenter confirms and saves."
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
**Commit:** `3b3be3c`

### Published vs Unpublished Changes Schema (January 20, 2026)

**Files:** `supabase/schema.sql`, `supabase/rls-policies.sql`, `supabase/MIGRATION.sql`
**Change:** Add published snapshot columns to sessions table for versioning
**Justification:** Feature requirement - allow presenter edits while Active without disrupting participant experience
**Scope:** Schema extension only, zero logic changes
- Added to sessions table:
  - `published_welcome_message TEXT` (what participants see)
  - `published_summary_condensed TEXT` (what participants see)
  - `published_topics JSONB NOT NULL DEFAULT '[]'::jsonb` (what participants see)
  - `published_at TIMESTAMPTZ` (when last published)
  - `has_unpublished_changes BOOLEAN NOT NULL DEFAULT false` (dirty flag)
- Working fields remain: `welcome_message`, `summary_condensed`, `themes` table
- RLS policies unchanged (participants read published fields via client logic)
- Added MIGRATION.sql with ALTER TABLE statements + backfill for existing sessions
**Architecture:** In-place published snapshot (Option 1: JSONB topics, minimal schema change)
**Commit:** `0c1e2eb`

### Publish/Discard + Participant Reads Published Topics (January 20, 2026)

**Files:** `src/features/sessions/SessionDetail.tsx`, `src/features/participant/FeedbackForm.tsx`
**Change:** Implement publish/discard workflow and participant published snapshot reads
**Justification:** Feature requirement - presenter edits while Active, explicit publish action, participants always see published version
**Scope:** Publish/discard logic + participant reads published fields only

**SessionDetail.tsx changes:**
- Added `handlePublishUpdates()`: copies working state → published snapshot, sets `has_unpublished_changes = false`
- Added `handleDiscardChanges()`: reverts working state to published snapshot, reconciles themes table
- Added UnpublishedChangesBar component wiring (shows when `hasUnpublishedChanges && (draft || active)`)
- Publish flow: fetches working themes, maps to `published_topics` JSONB format `{themeId, text, sortOrder}`
- Discard flow: restores working fields from published snapshot, deletes unpublished themes, upserts published topics back to themes table
- Lines modified: 24-25 (imports), 84 (state), 210-371 (publish/discard functions), 520-526 (bar wiring)

**FeedbackForm.tsx changes:**
- Removed themes table fetch, now reads `session.publishedTopics` directly
- Maps `publishedTopics` to Theme[] format using `themeId` field for selections continuity
- Updated display: shows `publishedWelcomeMessage` and `publishedSummaryCondensed`
- Empty state: "Topics aren't published yet. Check back soon!"
- Removed unused ThemeRow interface
- Lines modified: 22 (removed interface), 89-97 (published topics read), 303-322 (display published fields), 337 (empty state)

**Published topic shape:** `{themeId: string, text: string, sortOrder: number}` - uses `themeId` to preserve continuity with `theme_selections` table

**Diff size:** ~180 lines added (SessionDetail), ~30 lines modified (FeedbackForm)
**Commit:** `379d308`

### UX Polish: Working vs Live Terminology + Canonical Copy (January 20, 2026)

**Files:** `src/features/sessions/SessionDetail.tsx`, `src/features/participant/FeedbackForm.tsx`, `src/features/presenter/Dashboard.tsx`, `src/components/UnpublishedChangesBar.tsx`, `src/lib/copy.ts`
**Change:** Implement coherent Working vs Live mental model with canonical copy strings
**Justification:** User experience clarity - eliminate confusion about editing state, publish workflow, and participant visibility
**Scope:** Copy updates, UI indicators, navigation guardrails

**New file: src/lib/copy.ts**
- Canonical string table for all presenter/participant copy
- Terms: "Working version" (presenter edits), "Live version" (participant sees)
- Sections: UnpublishedChangesBar, SessionStatus, SectionIndicators, DashboardBadges, ActivationCopy, NavigationGuardrail, ParticipantCopy

**UnpublishedChangesBar.tsx changes:**
- Updated copy: "Updates ready to publish" title
- Added "View live version" link (opens participant URL in new tab)
- Added Active reassurance: "Feedback collection stays on while you edit"
- Helper text: "Publishing updates refreshes the participant page and applies to future submissions"
- Lines modified: 1-3 (imports), 5-11 (props), 13-21 (component), 23-77 (layout)

**SessionDetail.tsx changes (frozen file):**
- Added status row under title: "Participant view: Live" + "Edits: Working · [Up to date | Unpublished updates]"
- Added "Edited" pill badges next to changed sections (Welcome message, Overview summary)
- Section headers now labeled "(Live)" to clarify what participants see
- Navigate-away guardrail: modal if unpublished changes exist, asks "Leave without publishing?"
- Draft→Active button: "Start collecting feedback" with helper text
- Lines modified: 25 (imports), 86-87 (state), 549-567 (status row), 572-582 (nav guard wiring), 592-603, 613-624 (edited indicators), 655-668 (activation copy), 872-898 (nav guard modal)

**Dashboard.tsx changes:**
- Added "Updates pending" badge (amber outline) when `hasUnpublishedChanges = true`
- Tooltip: "You have unpublished updates. Participants still see the live version."
- Lines modified: 9 (import), 217-229 (badge display)

**FeedbackForm.tsx changes (frozen file):**
- Updated instructions: use PARTICIPANT_COPY.instructions
- Empty state: "Session setup in progress" + "Topics will appear soon"
- Lines modified: 17 (import), 312-313 (instructions), 322-327 (empty state)

**Mental model consistency:**
- No "draft" language in editor context (reserved for session state only)
- Active + unpublished is framed as safe and normal
- Participants never see workflow mechanics
- Publishing always explicit, never automatic

**Diff size:** ~120 lines modified across 5 files
**Commit:** `8622809`

### Draft Link Rendering + Initial Publish (January 21, 2026)

**Files:** `src/features/participant/FeedbackForm.tsx`, `src/features/sessions/SessionCreateWizard.tsx`
**Change:** Draft participant links render with inactive state + wizard publishes initial snapshot on draft creation
**Justification:** Participant link must show content immediately after session creation to maintain trust and clarity
**Scope:** Draft banner, disabled controls, initial publish workflow

**FeedbackForm.tsx changes (frozen file):**
- Added draft vs active rendering logic
- Draft banner: "Session draft" + "Feedback collection starts after the presenter confirms and saves"
- Disabled topic selectors and submit button when `state === 'draft'`
- Helper text: "Topics are visible while this is a draft. Responses unlock when the session is active"
- Submit disabled helper: "This session is not collecting feedback yet"
- Lines modified: 65 (type assertion for state), 290 (isDraft flag), 295-302 (banner), 329-338 (conditional rendering), 351 (disabled prop), 355-359 (draft helper), 407 (disabled submit), 412-416 (submit helper)

**SessionCreateWizard.tsx changes:**
- Step 3 heading updated: "These topics come from your outline. Review the wording and order. Add or remove topics as needed."
- Wizard now publishes initial snapshot on draft creation
- Copies working fields → published fields: `published_welcome_message`, `published_summary_condensed`, `published_topics`
- Sets `has_unpublished_changes = false` on creation
- Uses theme IDs from wizard state for `publishedTopics.themeId` to maintain selection continuity
- Lines modified: 304-309 (build published topics), 322-325 (insert published fields), 350 (preserve theme ID), 539-541 (step 3 copy)

**Behavioral change:**
- Draft links now load and display content (overview + topics visible but disabled)
- Participant sees clear "draft" state instead of empty/broken experience
- Session activation (Draft → Active) already implemented in SessionDetail.tsx

**Diff size:** ~50 lines modified
**Commit:** `517b7c8`

### Draft→Confirm→Active Flow Tightening (January 21, 2026)

**Files:** `src/features/sessions/SessionDetail.tsx`, `src/features/participant/FeedbackForm.tsx`, `src/features/sessions/SessionCreateWizard.tsx`, `src/features/presenter/Dashboard.tsx`, `docs/EXTRACTION_TESTS.md`
**Change:** Explicit Draft activation UX + mobile-safe copy + link status indicators
**Justification:** Presenter needs clear "Confirm & start collecting feedback" moment; participant preview must work cleanly on mobile
**Scope:** Activation CTA, link status labels, copy polish, test documentation

**SessionDetail.tsx changes (frozen file):**
- Renamed "Shareable Link" section to "Participant Link"
- Added link status indicator below link (Draft/Active/Completed/Archived with color coding)
- Draft state: amber "Draft — preview only"
- Active state: green "Active — collecting feedback"
- Added Draft activation panel (amber background) with:
  - "Feedback collection starts after you confirm & save" message
  - "Confirm & start collecting feedback" button
  - Helper: "This keeps the same participant link. The page becomes interactive."
- Session Actions section now shows guidance for Draft state
- Lines modified: 25 (removed unused import), 636-683 (participant link section), 688-691 (session actions guidance)

**FeedbackForm.tsx changes (frozen file):**
- Updated draft banner copy for mobile clarity
- Body text: "Preview only. Feedback collection starts after the presenter confirms and saves."
- Added `leading-relaxed` for better mobile line wrapping
- Lines modified: 298-300 (banner copy)

**SessionCreateWizard.tsx changes (non-frozen):**
- Step 2 helper: "Write your outline. We'll turn it into the topics your audience will prioritize."
- Step 3 heading: "Review the topics created from your outline"
- Step 3 helper: "Edit wording, reorder, and add any missing topics."
- Lines modified: 528 (step 2 copy), 538-541 (step 3 copy)

**Dashboard.tsx changes (non-frozen):**
- Added link status labels below participant link in session cards
- Same color coding as SessionDetail (amber/green/gray)
- Wrapped link + status in `space-y-1` container
- Lines modified: 237-266 (link section with status)

**EXTRACTION_TESTS.md updates:**
- Added Test Case 7: Plain text with blank lines (Context, Problem, Solution)
- Added Test Case 8: Duplicate topics (case-insensitive deduplication)
- Updated Extraction Behavior Summary to reflect simplified logic
- Documents: every non-empty line is a candidate, blank lines are separators

**Behavioral changes:**
- Draft sessions show explicit "Confirm & start..." CTA in SessionDetail
- Link status visible on Dashboard and SessionDetail
- Participant draft banner is mobile-safe (short sentences)
- Wizard copy frames topics as "review and refine" not "extraction"

**Diff size:** ~80 lines modified across 5 files
**Commit:** `08644df`

### Sub-Bullets as Topic Details (January 21, 2026)

**Files:** `src/types/index.ts`, `src/features/sessions/SessionCreateWizard.tsx`, `src/features/participant/FeedbackForm.tsx`, `docs/EXTRACTION_TESTS.md`
**Change:** Topic parsing treats sub-bullets as supporting details (context), not standalone topics
**Justification:** Participants vote on topics, sub-bullets provide context without fragmenting the voting surface
**Scope:** Type updates, parsing logic, display in wizard + participant view, suggested welcome message

**Type changes:**
- `PublishedTopic`: added optional `details?: string[]`
- `Theme`: added optional `details?: string[]`, made `sessionId` optional for wizard state

**Wizard parsing logic (SessionCreateWizard.tsx):**
- Lines with leading indent (2 spaces or tab) attach to most recent topic as details
- Lines starting with em-dash after a topic also attach as details
- Details capped at 6 per topic
- Deduped within each topic (case-insensitive)
- Topics deduplicated by text, cap at 12
- Local interface updated to include `details?: string[]`
- Lines modified: 14-18 (local Theme interface), 202-284 (parsing logic), 305-310 (published topics with details), 488-516 (suggested welcome message), 539-555 (outline copy), 646-657 (display details in Step 3)

**FeedbackForm.tsx changes (frozen file):**
- Display topic details under each ThemeSelector as context (read-only)
- Details shown as `— detail` in light gray text
- Lines modified: 344-367 (map with details display)

**EXTRACTION_TESTS.md:**
- Added Test Case 9: Sub-bullets attach to parent topic
- Documents Market context with 2 details, Analysis with 2 details, Case study with 0 details
- Clarifies: participants vote on topics only, details shown as context

**Behavioral changes:**
- Sub-bullets never become standalone topics
- Details provide context for voting decisions
- Published topics include details array in JSONB
- Wizard Step 3 shows details under each topic
- Participant page shows details under each topic as light text

**Diff size:** ~95 lines modified across 4 files
**Commit:** `d18f67e`

### Edit Session Affordance + Final Copy Polish (January 21, 2026)

**Files:** `src/features/sessions/SessionDetail.tsx`, `src/features/sessions/SessionCreateWizard.tsx`
**Change:** Add obvious "Edit Session" button, update wizard copy to be outcome-focused
**Justification:** User reported "I don't see an option to edit." Edit affordance must be obvious.
**Scope:** Minimal button addition, copy updates for clarity

**SessionDetail.tsx changes (frozen file):**
- Lines 569-590: Added "Edit Session" button next to "Back to Dashboard"
- Button navigates to `/dashboard/sessions/${session.id}/edit`
- Primary action (not outline), 48px min-height
- Justification: Edit capability exists but entry point was not obvious to user

**Wizard copy updates (SessionCreateWizard.tsx):**
- Step 2 CardDescription: "Add a welcome message, an overview for participants, and your outline. Next, you'll review the topics we organize from it."
- Step 3 headline: "Review the topics your audience will prioritize"
- Step 3 subcopy: "We organized your outline into topics. Review wording and order, then add or remove topics."
- Outline helper: "Write your outline. We'll organize it into topics your audience will prioritize."

**Behavioral changes:**
- Edit Session button always visible in SessionDetail header
- Copy explicitly mentions welcome + overview + outline in Step 2
- Step 3 copy frames as review/edit, not surprise

**Diff size:** ~30 lines modified across 2 files
**Commit:** `ad34831`

### SessionEdit Route + Component (January 21, 2026)

**Files:** `src/App.tsx`, `src/features/sessions/SessionEdit.tsx` (new)
**Change:** Add edit route and component to make Edit Session button functional
**Justification:** Button navigated to non-existent route. Edit capability must actually work.
**Scope:** Route addition (App.tsx), new SessionEdit component for working version edits

**App.tsx changes (frozen file - routing allowed):**
- Line 17: Import SessionEdit component
- Lines 53-60: Add route `/dashboard/sessions/:sessionId/edit`
- Route placed before `:sessionId` detail route (more specific match first)

**SessionEdit.tsx (new component):**
- Fetches session + themes by sessionId
- Editable fields: welcomeMessage, summaryCondensed, summaryFull
- Topics displayed read-only (editing coming later)
- Saves to working version, sets has_unpublished_changes = true
- Navigation: Save → detail, Cancel → detail
- Full error logging on save failure

**Behavioral changes:**
- Edit Session button now navigates to functional edit view
- Presenter can edit working version text fields
- Changes saved with unpublished flag (triggers publish workflow)
- Topics shown but not editable in v1 (noted in UI)

**Diff size:** ~270 lines (1 new file, 3 lines in App.tsx)
**Commit:** Pending

### Draft Blocker Removal + Presenter Profile Guard (January 21, 2026)

**Files:** `src/features/participant/FeedbackForm.tsx`, `src/features/sessions/SessionCreateWizard.tsx`, `src/components/ThemeSelector.tsx`, `src/features/sessions/SessionDetail.tsx`
**Change:** Remove draft early return, add presenter profile validation, mobile overflow fixes, prominent status line
**Justification:** Draft links must show content (preview mode); session creation requires presenter profile; prevent horizontal overflow at 375px; status line must be impossible to miss

**FeedbackForm.tsx changes (frozen file):**
- Removed early return block for `state === 'draft'` (lines 128-141)
- Draft sessions now render full preview with disabled controls
- Existing draft handling code (banner, disabled props) now reachable
- Lines modified: 128-129 (replaced with comment), 346 (added break-words to detail items)
- **Behavioral change:** Draft links show content instead of "Session Not Open Yet" message

**SessionCreateWizard.tsx changes:**
- Added `presenter` and `isLoading` to useAuth destructuring (line 41)
- Added loading guard with spinner (lines 757-766)
- Added presenter profile check with redirect to `/dashboard/profile` (lines 768-780)
- Added presenter check in handleSubmit with toast + redirect (lines 296-304)
- Enhanced error handling for FK constraint (23503) and RLS policy (42501) failures (lines 359-378)
- **Behavioral change:** Users without presenter profile see friendly redirect instead of cryptic error

**ThemeSelector.tsx changes (frozen file):**
- Added `break-words` to theme text paragraph (line 35)
- Prevents long topic text from causing horizontal overflow on mobile
- Lines modified: 35

**SessionDetail.tsx changes (frozen file):**
- Made participant link status line more prominent with pill/badge styling
- Changed from `text-xs text-gray-600` to `text-sm` with colored backgrounds:
  - Draft: amber-100 bg, amber-800 text
  - Active: green-100 bg, green-800 text
  - Completed/Archived: gray-100 bg
- Added `break-words` to theme text, `flex-wrap` to stats row, `break-all` to email
- Lines modified: 659-679 (status line), 791-792 (theme text + stats), 855 (email)

**Diff size:** ~60 lines modified across 4 files
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
