# Feedbacker App — Agent Instructions

**Last Updated:** January 17, 2026  
**Version:** 1.0

This document is the authoritative source for project-specific agent behavior.

---

## Project Context

### What This App Does
Presenters share what they're working on → Participants indicate what interests them → AI generates a prioritized presentation outline based on collective feedback.

### Why It Exists
Presenters shouldn't guess what their audience wants. This tool flips the model: gather interest signals first, then tailor the presentation.

### Who Uses It
- **Presenters:** Technology executives, professionals preparing talks
- **Participants:** Audience members who will attend the presentation

---

## Core Principles

### 1. Low Friction Above All
- Participants: Can respond in under 2 minutes
- Everything optional except access email
- No account creation for participants
- No password for presenters (magic link only)

### 2. Presenter Control
- All AI-generated content is editable
- Explicit state transitions (no auto-advance)
- Clear visibility into all responses
- **Working vs Live model:** Edit while Active without disrupting participants
- **Explicit publishing:** "Publish updates" action prevents accidental changes

### 3. Simple Over Clever
- Manual refresh over real-time
- Email-based access over OAuth
- Copy link over in-app sharing
- Publish/discard over auto-sync

---

## User Flows (Authoritative)

### Presenter: First Time

```
1. Land on homepage
2. Enter email
3. Receive magic link (Resend email)
4. Click link → /auth/callback
5. Redirect to /dashboard/profile (first time)
6. Enter: name, organization
7. Optional: upload logo, brand guidelines
8. Save → redirect to /dashboard
```

### Presenter: Create Session

```
1. From /dashboard, click "Create New Session"
   - OR click "Use as Template" on archived session
2. Step 1: Enter title and session length (minutes)
3. Step 2: Enter outline or notes
   - Paste bullet outline or free-form notes
   - In-wizard guidance shows optimal format:
     * Collapsible helper with example outline
     * Top-level bullets for main topics (3–10 words)
     * Sub-bullets for supporting detail
     * Optional "Topic:" prefix improves extraction accuracy
   - Optional: Enter welcome message
   - Optional: Draft overview summary (can auto-generate from outline)
4. Step 3: Extract and review topics
   - Click "Extract topics from outline"
   - Extraction heuristics:
     * Prioritizes top-level bullets (minimal indentation)
     * Strips "Topic:" prefix for display
     * Filters topics >120 characters
     * Caps at 12 topics
     * Fallback to second-level bullets if <4 found
   - Review banner appears after extraction
   - Manually add/edit/remove/reorder topics as needed
5. Step 4: Review all session details
6. Click "Create Session" → Session state: draft
7. From session detail, click "Start collecting feedback" → draft → active
```

### Presenter: View Results

```
1. From /dashboard, click active session
2. See: title, summary, response count, respondent list
3. Click "View Results"
4. See tabs:
   - Individual responses (by participant)
   - Aggregated by theme (sorted by net interest)
   - AI spotlights (unique/interesting items)
   - Write-in summary (grouped free-form)
   - Generated outline (if 2+ responses)
5. Export: copy or download outline
```

### Presenter: Manage Sessions

```
Active session:
- View responses
- Edit Working version (summary/topics)
- Publish updates (make Working → Live)
- Discard changes (revert Working to Live)
- Mark as Completed
- Delete

Completed session:
- View results
- Export outline
- Move to Archived
- Delete

Archived session:
- View (read-only)
- Use as Template (creates new draft)
- Delete
```

### Participant: Submit Feedback

```
1. Open shared link (/s/:slug)
2. Enter email
3. If returning: see previous response pre-filled
4. See: welcome message, session length, summary (expandable)
5. For each theme:
   - Tap 👍 (more interested)
   - Tap 👎 (less interested)
   - Or leave neutral (no tap)
6. Optional: enter name, contact email
7. Optional: enter free-form thoughts
8. Click Submit
9. See "Thank you" message
```

---

## Working vs Live Model

### Overview

**Mental model:** Working version (presenter edits) vs Live version (participants see)

**When active:**
- Active sessions only
- Draft/Completed/Archived use single version

**Purpose:**
- Allow presenter edits during Active without disrupting participants
- Explicit "Publish updates" prevents accidental changes
- Participants always see stable Live version

### Database Fields

**Working fields (presenter edits):**
- `welcome_message`
- `summary_condensed`
- `themes` table (relational rows)

**Live fields (participants read):**
- `published_welcome_message`
- `published_summary_condensed`
- `published_topics` (JSONB array of `{themeId, text, sortOrder}`)
- `published_at` (timestamp)

**Dirty flag:**
- `has_unpublished_changes` (boolean)

### UI Components

**UnpublishedChangesBar** (shown when `has_unpublished_changes = true`):
- Title: "Updates ready to publish"
- Body: Explains participants see Live version
- Actions: "Publish updates" | "Discard changes"
- Link: "View live version" (opens participant URL)
- Active reassurance: "Feedback collection stays on while you edit"

**SessionDetail status row** (Draft/Active only):
- "Participant view: Live"
- "Edits: Working · [Up to date | Unpublished updates]"

**Edited indicators:**
- Amber "Edited" pills next to changed sections
- Compare Working vs Live fields

**Dashboard badge:**
- "Updates pending" (amber outline) when `has_unpublished_changes = true`

**Navigate-away guardrail:**
- Modal when leaving with unpublished changes
- "Leave without publishing?" confirmation

### Canonical Copy

All UX strings defined in `src/lib/copy.ts`:
- `TERMS`: Working version, Live version, Publish updates, Discard changes
- `UNPUBLISHED_CHANGES_BAR`: Title, body, actions, helpers
- `SESSION_STATUS`: Status row labels
- `SECTION_INDICATORS`: Edited pill
- `DASHBOARD_BADGES`: Updates pending badge
- `ACTIVATION_COPY`: Draft→Active button
- `NAVIGATION_GUARDRAIL`: Leave without publishing modal
- `PARTICIPANT_COPY`: Instructions, empty state

**Rule:** Use canonical strings, never hardcode copy.

---

## Technical Architecture

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| AI | OpenAI GPT-4o |
| Email | Resend |
| Hosting | Vercel |

### Database Tables

| Table | Purpose |
|-------|---------|
| `presenters` | Presenter profiles |
| `sessions` | Session metadata + state |
| `themes` | AI-generated themes per session |
| `responses` | Participant responses |
| `theme_selections` | Interest signals (more/less) |

### Key Files

| Path | Purpose |
|------|---------|
| `src/features/presenter/Dashboard.tsx` | Main presenter view |
| `src/features/presenter/SessionCreate/` | Multi-step wizard |
| `src/features/presenter/ResultsView.tsx` | Aggregated feedback |
| `src/features/participant/FeedbackForm.tsx` | Participant input |
| `src/hooks/useSessions.ts` | Session CRUD |
| `src/hooks/useResponses.ts` | Response operations |
| `src/hooks/useAIGeneration.ts` | All AI calls |
| `src/lib/supabase.ts` | Database client |
| `src/lib/openai.ts` | AI client + prompts |

---

## Invariants (NEVER VIOLATE)

### Session States

Only these four states exist:
1. `draft` — Creating, not shared yet
2. `active` — Shared, collecting responses
3. `completed` — Done collecting, still accepts responses
4. `archived` — Closed, read-only, link shows "closed"

**Valid transitions only:**
- draft → active
- active → completed
- completed → archived
- archived → (new draft via template)

### Theme Selection

Per participant, per theme:
- `more` = more interested
- `less` = less interested
- (no row) = neutral

**Never both more AND less for same theme.**

### Authentication

- Presenter: Magic link required (verified email)
- Participant: Email entry only (unverified)

### Data Persistence

- Supabase: All persistent data
- localStorage: Only for session recovery during wizard

---

## Component Contracts

### ThemeSelector
```typescript
interface ThemeSelectorProps {
  theme: Theme;
  selection: 'more' | 'less' | null;  // null = neutral
  onSelect: (selection: 'more' | 'less' | null) => void;
  disabled?: boolean;
}

// Behavior:
// - Tap 👍 when neutral → selection = 'more'
// - Tap 👍 when already 'more' → selection = null (deselect)
// - Tap 👎 when 'more' → selection = 'less' (switch)
// - Same logic for 👎
```

### SummaryDisplay
```typescript
interface SummaryDisplayProps {
  condensed: string;
  full: string;
  defaultExpanded?: boolean;  // default: false
}

// Behavior:
// - Shows condensed by default
// - "Read more" expands to full
// - "Read less" collapses
// - Smooth animation
```

### OutlineDisplay
```typescript
interface OutlineDisplayProps {
  outline: Outline;
}

// Outline shape:
interface Outline {
  sections: {
    title: string;
    subPoints: string[];
  }[];
}

// Renders as:
// Section 1 Title
//   • Sub-point 1
//   • Sub-point 2
// Section 2 Title
//   • Sub-point 1
```

---

## Hook Contracts

### useSessions

```typescript
// Returns
{
  sessions: Session[];
  activeSessions: Session[];      // draft + active + completed
  archivedSessions: Session[];    // archived only
  loading: boolean;
  error: string | null;
}

// Methods
createSession(input: CreateSessionInput): Promise<Session>
updateSession(id: string, input: UpdateSessionInput): Promise<void>
transitionState(id: string, to: SessionState): Promise<void>
deleteSession(id: string): Promise<void>
useAsTemplate(archivedId: string): Promise<Session>  // Returns new draft
refetch(): Promise<void>
```

### useResponses

```typescript
// Returns (for a specific session)
{
  responses: Response[];
  responseCount: number;
  aggregatedThemes: AggregatedTheme[];
  loading: boolean;
  error: string | null;
}

// Methods
submitResponse(input: SubmitResponseInput): Promise<void>
updateResponse(id: string, input: UpdateResponseInput): Promise<void>
refetch(): Promise<void>

// AggregatedTheme shape
interface AggregatedTheme {
  theme: Theme;
  moreCount: number;
  lessCount: number;
  netInterest: number;  // moreCount - lessCount
}
```

### useAIGeneration

```typescript
// Returns
{
  isGenerating: boolean;
  error: string | null;
}

// Methods (all return generated content)
generateThemes(summary: string, lengthMinutes: number): Promise<Theme[]>
generateTitle(summary: string): Promise<string>
generateWelcome(summary: string): Promise<string>
generateSlug(title: string): Promise<string>
generateCondensedSummary(full: string): Promise<string>
generateSpotlights(responses: Response[]): Promise<Spotlight[]>
generateWriteInSummary(responses: Response[]): Promise<string>
generateOutline(responses: Response[], themes: Theme[]): Promise<Outline>
```

---

## AI Prompts (Reference)

### Theme Generation

```
System: You are helping a presenter prepare for a talk. Given their summary
of what they're working on, extract 5-10 potential themes the audience might
want to hear more about.

User: Generate {count} themes from this summary:
"{summary}"

Output JSON array of theme strings.
```

### Outline Generation

```
System: You are helping a presenter create a presentation outline based on
audience feedback. Prioritize themes with higher interest. Create sections
with sub-points.

User: Create an outline based on:
- Themes (sorted by interest): {themes with counts}
- Free-form feedback: {aggregated write-ins}
- Session length: {minutes} minutes

Output JSON with sections array, each having title and subPoints array.
```

---

## Error Handling

### AI Generation Errors

1. Auto-retry once (1 second delay)
2. If retry fails:
   - Show user-friendly error
   - Offer manual fallback
   - Log technical details to console

### Database Errors

1. Show user-friendly error message
2. Offer retry button
3. Never leave user stuck

### File Upload Errors

1. Attempt partial extraction
2. Show what was extracted
3. Offer manual paste fallback

---

## Security Notes

### Sensitive Data

- Presenter emails: stored, verified via magic link
- Participant emails: stored, unverified
- Brand guidelines: stored in Supabase Storage
- No passwords stored (magic link only)

### Access Control

- Presenters see ONLY their own sessions
- Participants see ONLY the session they're accessing
- Session access: slug must match exactly
- Presenter dashboard: auth required

---

## Current State

**Status:** Pre-development (documentation complete)

**What exists:**
- Complete documentation package
- Architecture decisions locked
- Database schema designed
- Component contracts defined

**What's working:** N/A (not yet implemented)

**Progress tracking:** See `PLAN.md` for day-by-day implementation plan.

---

## Known Issues

**Platform concerns:**
- Windows: Test file upload paths (\ vs /)
- Windows: PowerShell commands may differ from bash examples

**Edge cases to watch:**
- Large file uploads (PDFs > 10MB)
- Slow network AI generation timeouts
- Session state transitions during concurrent edits

---

## Testing Requirements

### Before Any PR

1. `npm run build` passes
2. `npm run lint` passes
3. Zero console errors

### Manual Testing Required

For each change, test at 375px first:

1. **Presenter flows:**
   - Magic link → dashboard
   - Create session (all steps)
   - View responses
   - Export outline
   - Archive session

2. **Participant flows:**
   - Access via link
   - Enter email
   - Select themes
   - Submit
   - Return and edit

---

## Common Mistakes to Avoid

### ❌ Hardcoding Session States
```typescript
// WRONG
if (session.state === 'active' || session.state === 'completed') { ... }

// RIGHT
const canParticipantsAccess = ['active', 'completed'].includes(session.state);
```

### ❌ Mutating State Directly
```typescript
// WRONG
session.state = 'completed';
await supabase.from('sessions').update(session);

// RIGHT
await transitionState(session.id, 'completed');
```

### ❌ Skipping Loading States
```typescript
// WRONG
const responses = await fetchResponses();
return <ResponseList responses={responses} />;

// RIGHT
if (loading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
return <ResponseList responses={responses} />;
```

### ❌ Forgetting Mobile
```typescript
// WRONG
<button className="h-8 w-8">...</button>

// RIGHT
<button className="min-h-[48px] min-w-[48px]">...</button>
```

### ❌ Using any
```typescript
// WRONG
const data: any = await response.json();

// RIGHT
const data: SessionResponse = await response.json();
```

---

## When Stuck

1. Re-read `.windsurfrules`
2. Re-read `docs/contract.md`
3. Check `docs/ARCHITECTURE.md` for data flow
4. Check `docs/SPEC.md` for requirements
5. ASK — don't guess

---

**This document is authoritative for project-specific behavior.**
