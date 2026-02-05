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

### Participant Feedback UX Cleanup (February 5, 2026)

**Files:**
- `src/features/participant/FeedbackForm.tsx`
- `src/features/sessions/SessionDetail.tsx`

**Change:** Tighten participant suggested-topics helper copy, remove additional-thoughts prompt remnants, serialize suggested topics only, keep Topic Prioritization above Participant suggestions, show share-step framing above monitoring, and use a single "Analyze so far" CTA only after at least one response exists.

**Justification:** UX cleanup - analysis UI was visible with zero responses and participant form still reflected outdated guidance. Required to align presenter/participant flow with current UX spec.

**Scope:** Copy + conditional rendering adjustments only. No schema or state-machine changes.

### Presenter/Participant UX Ordering (February 5, 2026)

**Files:**
- `src/features/participant/FeedbackForm.tsx`
- `src/features/sessions/SessionDetail.tsx`

**Change:** Streamline suggested topics instructions, reorder audience feedback sections (Topic Prioritization → Participant suggestions → Individual Responses), and surface suggested topics/additional notes within individual response cards. Add a collapsed "Reference" section to reduce repeated scrolling.

**Justification:** UX fix - reduce confusion on the participant form and make presenter review flow align with the intended feedback → analysis → deck workflow.

**Scope:** UI layout + copy only; no data model or routing changes.

**Commit:** `1f923f5`

### Outline Draft Lifecycle + Participant Form Simplification (February 5, 2026)

**Files:**
- `src/features/participant/FeedbackForm.tsx`
- `src/features/sessions/SessionDetail.tsx`

**Change:** Remove additional-thoughts field from participant form, simplify suggested topic instructions, add per-respondent suggested topics list, and update outline generation UI to support update/replace versioning semantics.

**Justification:** UX and workflow clarity - align participant input with suggested-topics focus and make outline regeneration explicit and safe.

**Scope:** UI layout + prompt flow; no schema changes.

**Commit:** `b5a42cc`

### Presenter Monitoring Flow + Outline CTA Cleanup (February 5, 2026)

**Files:**
- `src/features/participant/FeedbackForm.tsx`
- `src/features/sessions/SessionDetail.tsx`
- `src/features/sessions/DeckBuilderPanel.tsx`

**Change:** Add step framing around the share card, enforce vote-first ordering, collapse individual responses into a reference-only section, remove regenerate outline UI, and simplify participant suggested topics instructions.

**Justification:** UX clarity - ensure the presenter flow reads as share → monitor → analyze and avoid premature or destructive actions.

**Scope:** UI copy + ordering only; no data model changes.

**Commit:** `e2dd6d4`

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

### Mobile UX Fixes + Error Boundary (January 21, 2026)

**Files:** `src/App.tsx`, `src/features/sessions/SessionDetail.tsx`, `src/features/presenter/ProfileSetup.tsx`, `src/components/ErrorBoundary.tsx` (new)
**Change:** Fix mobile header overflow, add exit path from Edit Profile, add error boundary for presenter pages
**Justification:** Mobile UX regressions - header buttons overflow at 375px, Edit Profile stuck without exit, blank screen needs fallback

**App.tsx changes (frozen file - routing allowed):**
- Added ErrorBoundary import
- Wrapped SessionEdit and SessionDetail routes with ErrorBoundary
- Provides fallback UI instead of blank screen on uncaught errors

**SessionDetail.tsx changes (frozen file):**
- Header now uses `flex-col sm:flex-row` for responsive stacking
- Buttons stack vertically at mobile width, horizontal at sm+
- Title uses smaller font on mobile (text-xl vs text-2xl)
- Added `min-w-0 flex-1` to title container for proper truncation

**ProfileSetup.tsx changes:**
- Added "Back to Dashboard" button in edit mode when presenter exists
- Users can now exit profile edit without making changes

**ErrorBoundary.tsx (new component):**
- Class-based React error boundary
- Catches uncaught errors in presenter pages
- Shows user-friendly message with "Try again" and "Back to Dashboard" buttons
- Logs error details to console

**Behavioral changes:**
- SessionDetail header no longer overflows at 375px
- Edit Profile always has exit path to dashboard
- Edit Session / Session Detail show error card instead of blank screen on failure

**Diff size:** ~80 lines (1 new file, 20 lines App.tsx, 30 lines SessionDetail, 10 lines ProfileSetup)
**Commit:** Pending

### Mobile Hierarchy Refactor (January 21, 2026)

**Files:** `src/features/sessions/SessionDetail.tsx`
**Change:** Complete restructure of SessionDetail for mobile-first hierarchy
**Justification:** Page was visually busy with competing actions; needed clear single-decision hierarchy per state

**Structural changes:**
1. **Sticky top bar**: Back (icon + text) left, overflow menu (⋯) right
   - Replaces full "Back to Dashboard" button in header
   - Overflow menu contains: Edit session, Close/Archive session

2. **Header card simplified**: Title + Badge + minimal metadata
   - Removed "Participant view: Live" and "Edits: Working" from header
   - Moved operational metadata to collapsible Details accordion

3. **State-specific primary action blocks**:
   - Draft: "Edit session" button with subtext
   - Active: "Copy participant link" + "Open participant page"
   - Completed: "View audience feedback"

4. **Draft activation block**: Separate amber card
   - Clear separation from edit controls
   - Badge: "Draft — preview only"
   - CTA: "Confirm & start collecting feedback"

5. **Participant link section**: Standalone card
   - URL + Copy button
   - "Preview/Open participant page" link

6. **Details accordion**: Collapsed by default
   - Session ID, Slug, Edits status, Last published date
   - Keeps operational metadata out of decision zone

7. **Tabs default based on state**:
   - Active: defaults to "Audience feedback"
   - Others: defaults to "Session details"

**Copy changes:**
- "Back to Dashboard" → "Dashboard" (icon + text in top bar)
- "Participant view: Live" → Removed from header
- "Preview participant page" (draft) / "Open participant page" (active)

**Diff size:** ~200 lines (major restructure)
**Commit:** `46a8f3c`

### Session UX Stability Pass (January 21, 2026)

**Files:** `src/features/sessions/SessionDetail.tsx`, `src/features/sessions/SessionEdit.tsx`, `src/features/auth/AuthContext.tsx`, `src/features/auth/ProtectedRoute.tsx`
**Change:** Fix duplicate feedback surfaces, iPhone back button data loss, auth bootstrap race, EditSession crash prevention
**Justification:** Multiple reported UX issues: duplicate feedback areas, silent data loss on iOS, first-load spinner, Edit Session failures

**Item 1: Audience feedback consolidation**
- SessionDetail.tsx: Converted Tabs to controlled mode
- "View audience feedback" button now switches tab + scrolls
- Eliminated duplicate feedback content surfaces
- Added responseCount fetch for smart tab default

**Item 2: iPhone back button protection**
- SessionEdit.tsx: Added popstate interception for iOS Chrome
- Pushes history state on mount, catches popstate events
- Shows "Leave without saving?" modal before navigation
- Added localStorage draft persistence for crash recovery
- Restore prompt when reopening with unsaved draft

**Item 3: Participant message field clarity**
- SessionDetail.tsx: Renamed "Full Summary" to "Your outline"
- Added helper: "For your reference only — not shown to participants"
- Consistent naming between SessionEdit and SessionDetail

**Item 4: Topic hygiene (line fragment collapse)**
- SessionEdit.tsx: Enhanced createTopicsFromOutline()
- Merges consecutive short topics (≤20 chars or single word)
- Dedupes case-insensitive variants ("why?" vs "Why")
- Prevents fragmented topic lists from malformed outlines

**Item 5: Edit Session crash prevention**
- SessionEdit.tsx: Added mount context logging (dev)
- Payload debug snapshot shows raw data shape
- Defensive normalization before form binding
- ?crash=1 query param for ErrorBoundary testing (dev)

**Item 6: Auth bootstrap race fix**
- AuthContext.tsx: Only setIsLoading(false) after getSession completes
- Removed premature loading false from onAuthStateChange events
- Added comprehensive bootstrap timing logs (dev)
- ProtectedRoute.tsx: Added 6s "still loading" fallback with Retry/Back buttons

**Behavioral changes:**
- Single canonical feedback surface (Audience feedback tab)
- Draft recovery after browser crash or accidental navigation
- No silent data loss from iOS back gesture
- First load succeeds without refresh
- Topic parsing produces cleaner, deduplicated lists

**Diff size:** ~300 lines across 4 frozen files
**Commit:** `fc987b1`

### Data Router Migration + Navigation Protection (January 21, 2026)

**Files:** `src/App.tsx`, `src/features/sessions/SessionEdit.tsx`, `src/features/sessions/SessionDetail.tsx`, `src/features/sessions/SessionCreateWizard.tsx`, `src/hooks/useSessions.ts`
**Change:** Migrate to data router, fix Edit Session crash, add create wizard protection
**Justification:** Critical bug fixes - useBlocker crashed because app used BrowserRouter instead of data router; response counts inconsistent; create wizard had no navigation protection

**App.tsx changes (frozen file - routing restructure):**
- Replaced `BrowserRouter` + `Routes` with `createBrowserRouter` + `RouterProvider`
- Created `RootLayout` component that wraps all routes with `AuthProvider` + `Toaster`
- Route structure preserved exactly, only implementation changed
- **Required for useBlocker support** - useBlocker only works with data routers
- Lines modified: 7-82 (complete restructure, same routes)

**SessionEdit.tsx changes (frozen file):**
- Fixed setState during render bug in blocker handling
- Replaced `if (blocker.state === 'blocked') { setState... }` with derived state
- Added `dialogOpen = isBlockerActive || showUnsavedDialog` for dialog visibility
- Improved topic fragment detection (more conservative threshold, exempt section names)
- Lines modified: 246-260 (blocker handling), 560-580 (confirm/cancel), 848 (dialog open prop), 15-33 (fragment detection)

**SessionDetail.tsx changes (frozen file):**
- Added useEffect to fetch results on mount (not just on tab switch)
- Fixes "1 response" on dashboard vs "0 responses" in detail until tab switch
- Lines modified: 163-170 (new effect)

**SessionCreateWizard.tsx changes:**
- Added full navigation protection matching SessionEdit:
  - `useBlocker(isDirty)` for in-app navigation
  - `popstate` interception for iOS back button
  - `beforeunload` handler for browser close/refresh
  - Draft restore prompt on reload
- Changed mount behavior: checks for saved draft instead of clearing
- Added two dialogs: "Unsaved changes" and "Resume previous session?"
- Lines modified: 1-11 (imports), 44-147 (protection logic), 937-956 (Exit button), 1000-1042 (dialogs)

**useSessions.ts changes:**
- Gate data fetches on `authLoading` from useAuth
- Prevents race condition where user is null during auth bootstrap
- Fixes first-load spinner requiring retry
- Lines modified: 37-48 (auth loading check), 117 (dependency)

**Root causes fixed:**
1. useBlocker requires data router, app was using BrowserRouter
2. SessionEdit called setState during render (React anti-pattern)
3. SessionDetail only fetched responses on tab switch, not mount
4. SessionCreateWizard had no navigation protection, cleared localStorage on mount
5. useSessions returned loading=false before auth completed

**Diff size:** ~290 lines across 5 files
**Commit:** `d1151cb`

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

### Cosmetic Polish + Documentation Sync (January 21, 2026)

**Files:** `src/features/presenter/ProfileSetup.tsx`, `src/features/sessions/SessionCreateWizard.tsx`, `src/features/sessions/SessionEdit.tsx`, `src/components/UnpublishedChangesBar.tsx`, `README.md`

**Change:** Final cosmetic pass on UI stability and comprehensive documentation synchronization

**Justification:** Cosmetic fixes to improve mobile UX and ensure all documentation accurately reflects current application state, schema, and architecture

**UI Changes:**
- ProfileSetup welcome back screen: Changed `min-h-screen` to `min-h-[100svh]` with `px-4 py-8` for stable centering on iOS
- SessionCreateWizard: Renamed "Basics" tile to "Presentation Title and Length" throughout
- SessionCreateWizard review: Reordered fields to show Title before Length
- UnpublishedChangesBar: Reduced from large amber block to minimal non-blocking actions row with preview links only
- Helper text: Unified to "Add a topic and optional sub-bullets." across create wizard and session edit

**Documentation Changes:**
- README.md: Updated setup instructions with migration steps
- README.md: Updated end-to-end demo to reflect current workflow
- README.md: Added Topic Encoding section explaining subtopic format
- README.md: Updated documentation table with current file references
- Archived 8 outdated docs to `archive/old-docs/`: PROJECT_SETUP_GUIDE.md, SCHEMA_FIXES.md, SCRAP.md, SUPABASE_SETUP_GUIDE.md, EXTRACTION_TESTS.md, MOBILE_AUDIT.md, SMOKE_TEST_RESULTS.md, TEST_LOG_2026-01-21.md

**Behavioral changes:**
- Welcome back screen no longer floats on iOS Safari/Chrome
- Yellow publish bar no longer blocks participant link after confirm
- All topic input fields use consistent helper text
- Documentation now serves as accurate operator's manual

**Build verification:**
- `npm run build` — ✅ Pass
- `npm run lint` — ✅ Pass (4 pre-existing Fast Refresh warnings)

**Diff size:** ~90 lines across 5 files, 8 docs archived
**Commit:** `023bf10`
**Tag:** `v0.1.0` — Stable release with cosmetic polish complete

---

### v0.1.1 Patch: Presenter Name + UI Cleanup (January 21, 2026)

**Files:** `src/features/participant/FeedbackForm.tsx`, `src/features/sessions/SessionCreateWizard.tsx`, `src/features/sessions/SessionDetail.tsx`, `README.md`, restored 8 markdown docs from archive

**Change:** Presenter name made visible to participants, metadata tile renamed for clarity, UnpublishedChangesBar removed entirely, documentation restored from archive

**Justification:** User-facing improvements for clarity and eliminating UI overlap. Documentation accuracy restored after premature archiving.

**Key Changes:**

**Presenter Name Visibility:**
- FeedbackForm now fetches presenter name from `presenters` table
- Participant metadata section displays: Title, Presenter, Length (in that order)
- ProfileSetup already enforced presenter name as required field (no changes needed)

**Metadata Tile Rename:**
- SessionCreateWizard: renamed "Presentation Title and Length" to "Title, Presenter and Length"
- Step indicator: "Title, Presenter & Length" (shortened for mobile)
- Review section now shows Title, Presenter, Length in correct order
- Presenter name pulled from AuthContext (presenter?.name)

**UnpublishedChangesBar Removal:**
- Removed entire UnpublishedChangesBar component usage from SessionDetail
- Removed import statement
- Removed fixed positioning header offset logic
- Removed unused `isPublishing` state
- Removed unused `handlePublishUpdates` and `handleDiscardChanges` functions (~160 lines)
- Preview/open actions moved inline with participant link section
- "Preview participant view" only shown for active sessions
- "Open participant page" always shown
- Both use small text links with ExternalLink icon
- No blocking banner, no UI overlap with participant link

**Preview vs Open Actions:**
- Preview participant view: `${participantUrl}?preview=working` (only active sessions)
- Open participant page: `${participantUrl}` (always available)
- Distinct purposes: preview shows working version (auth-gated), open shows published version

**Documentation Restored:**
- Moved 8 files back from `archive/old-docs/` to original locations:
  - PROJECT_SETUP_GUIDE.md (root)
  - SCHEMA_FIXES.md (root)
  - SCRAP.md (root)
  - SUPABASE_SETUP_GUIDE.md (root)
  - docs/EXTRACTION_TESTS.md
  - docs/MOBILE_AUDIT.md
  - docs/SMOKE_TEST_RESULTS.md
  - docs/TEST_LOG_2026-01-21.md

**README Accuracy Fix:**
- Removed false claim: "for `useBlocker` support"
- Router description now accurate: uses data router but navigation protection via `beforeunload`/`popstate` handlers in SessionEdit
- SessionEdit does NOT use useBlocker (uses browser event handlers instead)

**Build verification:**
- `npm run build` — ✅ Pass
- `npm run lint` — ✅ Pass (4 pre-existing Fast Refresh warnings)

**Diff size:** 12 files changed (+56 insertions, -196 deletions)
**Commit:** `fda2457`
**Tag:** `v0.1.1` — Clean UI, presenter visibility, accurate documentation

---

### Post-Freeze: Dashboard UX Polish (2026-01-22)

**Changes:**
1. Dashboard title/subtitle: "Presentation Feedbacker" with descriptive subtitle
2. Two sections with clear terminology:
   - "Active Sessions — Participant Voting Open" (with empty state message)
   - "Closed Sessions — Participant Voting Closed" (only shown when items exist)
3. Close voting action: Direct from active tile with confirmation dialog
4. Delete action: On closed tiles with confirmation dialog
5. Button alignment fix: "Add topic" button aligns to top of textarea (items-start)

**Implementation:**
- Dashboard sections filter by `state === 'active'` vs `state === 'completed'`
- Delete uses DB cascade (already configured in schema)
- Close voting transitions `active → completed` (same as detail page)
- Terminology consistent: "participant voting" not "session" or "presentation"

**Files Changed:**
- `src/features/presenter/Dashboard.tsx` — Sections, actions, dialogs
- `src/features/sessions/SessionEdit.tsx` — Button alignment
- `src/features/sessions/SessionCreateWizard.tsx` — Button alignment
- `README.md` — Updated user flows and architectural notes

**Build verification:**
- `npm run build` — ✅ Pass (2.24s)
- `npm run lint` — ✅ Pass (4 pre-existing Fast Refresh warnings)

**Diff size:** 4 files changed
**Commit:** `6e3ba3d`

**Follow-up fix (2026-01-22):**
- Active empty state now conditional (message only shows when no active sessions)
- Removed archived counter from dashboard
- **Commit:** `700787c` — Final freeze-worthy baseline

---

### Documentation Consolidation & Freeze (2026-01-22)

**Changes:**
- Moved 4 non-essential markdown files from root to `docs/`
- Moved 4 secondary/scratch docs to `docs/archive/` (extraction tests, mobile audit, smoke test results, test logs)
- Updated README documentation table to match `docs/` directory (12 canonical files)
- Added product/architecture canon pointers: `docs/SPEC.md` + `docs/ARCHITECTURE.md`
- Verified all links and file counts match

**Canon sources of truth:**
- Product requirements: `docs/SPEC.md`
- Technical architecture: `docs/ARCHITECTURE.md`

**Files in `docs/`:**
1. contract.md — Universal + project rules
2. SPEC.md — Product requirements
3. ARCHITECTURE.md — Technical architecture & schema
4. BASELINE_LOCK.md — Frozen file change log
5. TEST_CASES.md — Manual test checklist
6. REGRESSION_CHECKLIST.md — Smoke test for releases
7. TESTING.md — Testing strategy
8. SECURITY.md — Security model & RLS policies
9. PROJECT_SETUP_GUIDE.md — Detailed setup instructions
10. SUPABASE_SETUP_GUIDE.md — Supabase configuration
11. SCHEMA_FIXES.md — Schema migration notes
12. SCRAP.md — Development notes & scratchpad

**Commit:** `0750bfb` — Documentation table completeness fix

**Additional commits (2026-01-22):**
- `5b2f6eb` — Added Vercel deployment section and production URL
- `3f2104d` — Fixed Supabase setup guide env var (VITE_PUBLIC_BASE_URL)
- `85fd32b` — Archived SCHEMA_FIXES.md, updated SPEC.md for accuracy

**Final freeze point:** `85fd32b`
**Tag:** `v0.1.2`

---

### Final Documentation Freeze Summary (v0.1.2)

**Date:** January 22, 2026

**Scope:** Complete documentation consolidation, accuracy verification, and freeze

**Changes:**

1. **Documentation Organization:**
   - Root directory: README.md only (standard convention)
   - Canonical docs: 11 files in `docs/`
   - Historical/scratch: 8 files in `docs/archive/`

2. **Documentation Accuracy Updates:**
   - Added Vercel deployment instructions + production URL
   - Fixed SUPABASE_SETUP_GUIDE.md env var (VITE_PUBLIC_BASE_URL not VITE_APP_URL)
   - Updated SPEC.md session states to match implementation
   - Updated SPEC.md Dashboard section to reflect Active/Closed sections
   - Corrected participant voting terminology throughout SPEC.md
   - Archived historical SCHEMA_FIXES.md (fixes already in current schema)

3. **Canonical Documentation (11 files):**
   - `.windsurfrules` — Cascade agent rules
   - `docs/contract.md` — Universal + project rules
   - `docs/SPEC.md` — Product requirements (CANON)
   - `docs/ARCHITECTURE.md` — Technical architecture & schema (CANON)
   - `docs/BASELINE_LOCK.md` — This file
   - `docs/TEST_CASES.md` — Manual test checklist
   - `docs/REGRESSION_CHECKLIST.md` — Smoke test for releases
   - `docs/TESTING.md` — Testing strategy
   - `docs/SECURITY.md` — Security model & RLS policies
   - `docs/PROJECT_SETUP_GUIDE.md` — Detailed setup
   - `docs/SUPABASE_SETUP_GUIDE.md` — Supabase configuration
   - `docs/SCRAP.md` — Development scratchpad

4. **Verification:**
   - All moved file links use `docs/` paths (git grep verified)
   - All README links exist on disk (Python script verified)
   - File count matches README table: 11 canonical docs
   - Build passes (2.12s), lint passes (4 pre-existing warnings)

**Production:**
- Live URL: https://feedbacker-app-aqim.vercel.app
- Auto-deploys from `main` branch
- Supabase backend fully configured

**Frozen baseline confirmed:**
- Dashboard UX complete (active/closed sections, close voting, delete)
- Participant voting model implemented (voting closed state)
- Documentation accurate to final implementation
- All setup guides current and tested

---

---

### v0.1.3: UX Polish & Simplified Creation Flow (2026-01-22)

**Date:** January 22, 2026

**Scope:** Streamlined presentation creation, improved visual hierarchy, consistent tab navigation

**Changes:**

1. **Profile Page Header:**
   - Added "Presentation Feedbacker" title and subtitle to ProfileSetup page
   - Matches header styling from Dashboard and other pages
   - Both confirm mode and edit mode now show consistent branding

2. **Tabs Visual Distinction:**
   - Updated tabs.tsx with more prominent styling
   - TabsList: Added border, increased height (h-11), gray-100 background
   - TabsTrigger: Added border on active state, white background, shadow
   - Makes tabs more obviously interactive elements

3. **Wizard Creates Active Directly:**
   - SessionCreateWizard now creates presentations as 'active' (not 'draft')
   - Sets `published_at` timestamp on creation
   - Button text changed: "Confirm & Publish" (was "Create as Draft")
   - Success toast: "Presentation published" with description about being live
   - Eliminates extra "Start collecting feedback" step

4. **Session Detail Tab Navigation:**
   - Always defaults to 'results' (Audience feedback) tab for active/completed sessions
   - Removes "last tab memory" behavior that caused confusion
   - Draft sessions still default to 'details' tab

**Files Changed:**
- `src/features/presenter/ProfileSetup.tsx` — Header with title/subtitle
- `src/components/ui/tabs.tsx` — Enhanced visual styling
- `src/features/sessions/SessionCreateWizard.tsx` — Create as active, updated copy
- `src/features/sessions/SessionDetail.tsx` — Tab default behavior

**Build verification:**
- `npm run build` — ✅ Pass
- `npm run lint` — ✅ Pass

**Commit:** `b4a1419`
**Tag:** `v0.1.3`

---

### Auth Bootstrap Fix (2026-01-22)

**File:** `src/features/auth/AuthContext.tsx`

**Change:** Set `isLoading = false` immediately after session is confirmed, before fetching presenter profile

**Justification:** Bug fix - app hung on loading spinner when presenter profile fetch was slow or failed. The loading state was blocking on secondary data (profile) instead of unblocking after primary data (session).

**Root cause:** The `finally` block that set `isLoading(false)` only ran after `handleSession` completed, which included the `fetchPresenter` call. If `fetchPresenter` hung (network issues, slow response), the entire app stayed in loading state indefinitely.

**Fix:**
- Added `isInitialBoot` parameter to `handleSession`
- When `isInitialBoot=true` and session is valid, set `isLoading(false)` immediately after setting user
- Presenter profile still fetches in background and populates when ready
- User sees app immediately, profile data loads asynchronously

**Pattern documented in:**
- `docs/contract.md` — "Bootstrap Loading Pattern" section
- `.windsurfrules` — Under "React Patterns (Mandatory)"

**Lines modified:** 87-97 (handleSession), 140-170 (getSessionWithRetry + finally block)

**Commit:** `408bd60`

---

### v0.1.4: Documentation & Patterns Milestone (2026-01-22)

**Date:** January 22, 2026

**Scope:** Comprehensive documentation of all patterns learned during development

**Documentation Added:**

1. **Supabase Patterns (contract.md + .windsurfrules):**
   - Client singleton for Vite HMR safety
   - Navigator Lock API workaround
   - Auth listener vs one-time getUser()
   - Presenter ID = auth.uid() for RLS
   - Bootstrap retry for AbortError
   - Magic link callback race condition

2. **Hard-Won Patterns (contract.md + .windsurfrules):**
   - Mobile overflow prevention (375px)
   - Navigation protection (4 layers)
   - Controlled tabs with context-based defaults
   - Data router requirement for useBlocker
   - Working vs Live versioning
   - Topic encoding with subtopics

3. **Bootstrap Loading Pattern:**
   - Never block loading on secondary fetches
   - Set loading false after primary data

**Purpose:** Preserve institutional knowledge to prevent recurring bugs and accelerate future development.

**Commits:**
- `408bd60` — Auth bootstrap fix
- `2d16906` — Supabase patterns documentation
- `9451641` — Hard-won patterns documentation

**Tag:** `v0.1.4`

---

### Deck Builder Feature (2026-02-01)

**File:** `src/features/sessions/SessionDetail.tsx`

**Change:** Add DeckBuilderPanel component to Results tab for AI outline generation + PPTX export

**Justification:** Feature addition - presenter can generate AI-powered presentation outline from audience feedback and export to PowerPoint

**Scope:** Minimal frozen file change
- Line 27: Added import for DeckBuilderPanel
- Lines 601-610: Added single component render in Results tab (after Individual Responses)

**New files created (not frozen):**
- `api/generate-outline.ts` — Vercel serverless function calling OpenAI GPT-4o
- `src/lib/generatePptx.ts` — PPTX generation utility using pptxgenjs
- `src/features/sessions/DeckBuilderPanel.tsx` — UI component for outline editing + export

**New dependency:** `pptxgenjs` (PowerPoint generation library)

**Environment requirement:** `OPENAI_API_KEY` in Vercel environment variables

**Behavioral changes:**
- Results tab shows "Deck Builder" card below Individual Responses
- Presenter can click "Analyze Responses" to generate AI outline
- Outline is editable (add/remove slides, bullets, sub-bullets)
- "Generate PowerPoint" exports .pptx file to browser downloads

**Diff size:** 2 lines in frozen file (import + render)
**Commit:** Pending

---

### UI/UX Polish Audit (2026-02-02)

**Files Modified:**
- `src/features/presenter/Dashboard.tsx` — Env var standardization
- `src/features/sessions/SessionDetail.tsx` — Env var standardization, Edit button for active sessions
- `src/features/presenter/ProfileSetup.tsx` — Welcome title for new users

**Change:** UI/UX consistency audit and targeted fixes

**Justification:** Systematic code audit revealed:
1. Inconsistent env var naming (`VITE_PUBLIC_BASE_URL` vs `VITE_APP_URL`)
2. Missing Edit button affordance for active sessions in SessionDetail
3. Unwelcoming title for first-time users

**Scope:** Minimal fixes, copy-only changes

**Fix 1: Environment Variable Standardization**
- Added `VITE_APP_URL` as primary, with fallback to `VITE_PUBLIC_BASE_URL` and `window.location.origin`
- Both Dashboard.tsx (line 192) and SessionDetail.tsx (line 78)

**Fix 2: Edit Button for Active Sessions**
- Added "Edit presentation" button in active state block (SessionDetail.tsx lines 771-776)
- Placed before "Close participant feedback" button
- Uses outline variant, links to `/dashboard/sessions/${session.id}/edit`

**Fix 3: Welcome Title for New Users**
- Changed ProfileSetup title from "Complete Your Profile" to "Welcome! Complete Your Profile"
- Only affects new users (existing users see "Edit Profile")

**New Files:**
- `e2e/ui-screenshots.spec.ts` — Screenshot test suite for visual regression prevention
- `artifacts/screenshots/` — Directory for screenshot artifacts

**Documentation Updates:**
- `docs/REGRESSION_CHECKLIST.md` — Added UI/UX screenshot tests, edit button check, env var consistency check

**Invariants Enforced:**
1. Environment variables: Always prefer `VITE_APP_URL`, fallback chain for backwards compatibility
2. Active sessions: Edit button visible alongside close button
3. Touch targets: All buttons maintain 48px minimum height

**Build verification:**
- `npm run build` — ✅ Pass
- `npm run lint` — ✅ Pass (0 errors, 4 pre-existing warnings)

**Diff size:** ~25 lines across 3 files
**Commit:** Pending

---

### Deck Builder & Screenshot Baseline — 2026-02-02

**Scope:** AI behavior verification infrastructure + UI screenshot tests

**What was added:**
1. **Structural equivalence tests:** `scripts/test-deck-builder-equivalence.ts` — verifies repeated API calls produce structurally equivalent outlines
2. **Failure mode tests:** `scripts/test-deck-builder-failures.ts` — edge case coverage
3. **Screenshot tests:** `e2e/ui-screenshots.spec.ts` — captures mobile/desktop states for login, feedback, dashboard, session detail, and Deck Builder
4. **Proof artifacts:** `artifacts/deck-equivalence-proof.json` — timestamped evidence of structural stability

**Why this matters:**
- AI behavior is now testable (not just "it works")
- UI/UX correctness enforced mechanically via screenshot comparisons
- Failure modes are first-class (documented, tested, not ignored)

**New npm scripts:**
```bash
npm run test:deck-structure     # Structural tests
npm run test:deck-failures      # Failure mode tests
npm run test:deck-equivalence   # Equivalence proof (2 runs)
```

**Build verification:**
- `npm run build` — Pass
- `npm run lint` — Pass
- `npm run test:deck-equivalence` — Pass (proof in artifacts/)

**Commit:** Pending

---

### P0 Integrity Fixes — 2026-02-03

**Scope:** Two data integrity fixes: preserve participant feedback during topic edits + complete Working vs Published lifecycle

**P0-A: Preserve participant feedback when editing topics**

Problem: `SessionEdit.tsx` deleted all themes and reinserted them on every save. Because `theme_selections` has `ON DELETE CASCADE` to `themes(id)`, this destroyed ALL participant feedback on every save.

Fix:
- Added `is_active BOOLEAN DEFAULT true` to themes table (soft-delete)
- Replaced delete-all/reinsert with diff-based save: UPDATE surviving themes, soft-delete removed themes, INSERT new themes
- Replaced `UNIQUE(session_id, sort_order)` with partial unique index (`WHERE is_active = true`)
- Added `is_active = true` filter to all theme queries (SessionDetail, FeedbackForm, DevResponseGenerator)

**P0-B: Complete Working vs Published lifecycle**

Problem: SessionEdit set `has_unpublished_changes = true` and FeedbackForm read from `published_*` fields, but there was no UI to publish or discard. Presenters had no way to push working changes to participants.

Fix:
- Rewrote `UnpublishedChangesBar` with real Publish and Discard buttons (using canonical copy from `src/lib/copy.ts`)
- Wired bar into `SessionDetail.tsx` — appears when `session.state === 'active' && session.hasUnpublishedChanges`
- Implemented `handlePublishUpdates`: copies working → published fields, builds `published_topics` from active themes, clears flag
- Implemented `handleDiscardChanges`: restores working from published (canonical), reconciles themes table to match `published_topics`, clears flag

**Files modified:**
- `supabase/migrations/add_is_active_to_themes.sql` (NEW — migration)
- `scripts/test-feedback-survives-edit.ts` (NEW — regression test)
- `src/features/sessions/SessionEdit.tsx` (diff-based save, is_active filter)
- `src/features/sessions/SessionDetail.tsx` (publish/discard handlers, bar wiring, is_active filter)
- `src/components/UnpublishedChangesBar.tsx` (real publish/discard buttons)
- `src/features/sessions/DevResponseGenerator.tsx` (is_active filter)
- `src/features/participant/FeedbackForm.tsx` (is_active filter)

**Build verification:**
- `npm run build` — Pass
- `npm run lint` — Pass (0 new errors)

**Commit:** Pending

---

## P0-C: Tokenized participant links + preview gating

Problem: Participant links could be shared before publish, and republish did not invalidate old links. Preview mode could be accessed without presenter auth.

Fix:
- Added `published_share_token` and `published_version` columns to sessions (migration).
- Rotated share token and incremented version on every publish/republish.
- Participant links include `?k=` token when present; legacy sessions without token continue to work.
- Preview `?preview=working` is restricted to the authenticated presenter.

**Files modified:**
- `supabase/migrations/add_published_share_token.sql` (NEW — migration)
- `src/lib/shareLink.ts` (URL building + token validation)
- `src/features/sessions/SessionDetail.tsx` (share URL, publish rotates token)
- `src/features/sessions/SessionCreateWizard.tsx` (token on publish-at-create)
- `src/features/participant/FeedbackForm.tsx` (token gate + preview restriction)
- `src/components/UnpublishedChangesBar.tsx` (live link uses token)
- `src/hooks/useSessions.ts`, `src/types/index.ts` (new fields)

**Build verification:**
- `npm run build` — Pending
- `npm run lint` — Pending

**Commit:** Pending

---

## Next Build Phase

**Focus:** Application feature development on stable foundation

**Constraint:** Must not modify frozen baseline unless absolutely necessary.
