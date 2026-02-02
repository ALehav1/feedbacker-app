# Feedbacker App - Architecture Documentation

**Last Updated:** February 2, 2026
**Version:** 1.3

---

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Core Concepts](#core-concepts)
4. [Data Flow](#data-flow)
5. [Component Architecture](#component-architecture)
6. [State Management](#state-management)
7. [External Services](#external-services)
8. [Database Schema](#database-schema)
9. [API Design](#api-design)
10. [Development Guidelines](#development-guidelines)

---

## Overview

### Purpose

Web application enabling presenters to gather structured audience feedback before presentations, then receive AI-generated prioritized outlines based on collective interest.

### Core Problem

Presenters guess what audiences want to hear. This app flips the model: share what you're working on → collect interest signals → tailor presentation to actual demand.

### User Roles

| Role | Description | Authentication |
|------|-------------|----------------|
| **Presenter** | Creates sessions, views aggregated feedback | Magic link via email |
| **Participant** | Responds to sessions with interests | Email entry (no verification) |

### Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Frontend | React + TypeScript | 19.2.0 / 5.9.3 | UI framework |
| Build | Vite | 7.2.4 | Development server + bundler |
| Styling | Tailwind CSS + shadcn/ui | 3.4.19 | Mobile-first design system |
| Database | Supabase (PostgreSQL) | 2.38.5 | Data persistence + Auth |
| Forms | React Hook Form + Zod | 7.71.1 / 4.3.5 | Form state and validation |
| PPTX | pptxgenjs | 4.0.1 | PowerPoint generation |
| Routing | React Router | 7.12.0 | Client-side routing |
| Hosting | Vercel | — | Deployment |

**Future Integrations (not yet implemented):**
| Service | Technology | Purpose |
|---------|------------|---------|
| AI | OpenAI GPT-4o | Theme generation, outline creation |
| Email | Resend | Magic links, notifications |
| Storage | Supabase Storage | File uploads (logos, PDFs) |

### shadcn/ui Setup (IMPORTANT)

shadcn/ui provides accessible, customizable components that live in YOUR codebase (not node_modules). This is critical for AI-assisted development because Cascade can read and modify these components.

**Initial Setup:**
```bash
# Initialize shadcn (choose default settings)
pnpm dlx shadcn@latest init

# Add essential components
npx shadcn@latest add button card dialog form input label toast skeleton tabs dropdown-menu alert textarea
```

**Why shadcn over other libraries:**
- Components are copied INTO your repo (AI can edit them)
- Built on Radix UI primitives (accessibility included)
- Tailwind-based (consistent with your styling)
- No runtime dependencies to break

**Component locations:**
- `src/components/ui/` - shadcn primitives (button, input, etc.)
- `src/components/` - Your custom composite components

---

## Project Structure

```
feedbacker-app/
├── .windsurfrules               # Cascade agent rules (MANDATORY READ)
├── docs/
│   ├── contract.md              # Universal + project rules
│   ├── ARCHITECTURE.md          # This file
│   ├── SPEC.md                  # Product requirements
│   ├── SECURITY.md              # Security model & RLS policies
│   ├── TESTING.md               # Testing strategy
│   ├── TEST_CASES.md            # Manual test checklist
│   ├── PROJECT_SETUP_GUIDE.md   # Detailed setup instructions
│   ├── SUPABASE_SETUP_GUIDE.md  # Supabase configuration
│   ├── BASELINE_LOCK.md         # Frozen file change log
│   └── REGRESSION_CHECKLIST.md  # Smoke test for releases
│
├── src/
│   ├── features/                # Feature-based modules
│   │   ├── auth/                # Authentication
│   │   │   ├── AuthCallback.tsx      # Magic link callback handler
│   │   │   ├── AuthContext.tsx       # Auth state provider
│   │   │   ├── LoginPage.tsx         # Email entry for login
│   │   │   └── ProtectedRoute.tsx    # Route guard for dashboard
│   │   │
│   │   ├── presenter/           # Presenter-only views
│   │   │   ├── Dashboard.tsx         # Session list + create button
│   │   │   └── ProfileSetup.tsx      # First-time profile setup
│   │   │
│   │   ├── sessions/            # Session management
│   │   │   ├── SessionCreateWizard.tsx  # Multi-step creation wizard
│   │   │   ├── SessionCreate.tsx        # Legacy/alternate create
│   │   │   ├── SessionDetail.tsx        # Session view + results tabs
│   │   │   ├── SessionEdit.tsx          # Edit active session
│   │   │   ├── DeckBuilderPanel.tsx     # AI outline + PPTX export
│   │   │   └── DevResponseGenerator.tsx # Dev-only test data generator
│   │   │
│   │   └── participant/         # Participant-only views
│   │       └── FeedbackForm.tsx      # All-in-one: access, voting, thank you
│   │
│   ├── components/              # Shared UI components
│   │   ├── ui/                  # shadcn/ui primitives (button, card, dialog, etc.)
│   │   ├── ThemeSelector.tsx    # Cover more/Cover less voting control
│   │   ├── ErrorBoundary.tsx    # React error boundary wrapper
│   │   └── UnpublishedChangesBar.tsx # Publish/discard working changes
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useSessions.ts       # Session CRUD + state transitions
│   │   └── use-toast.ts         # Toast notification hook (shadcn)
│   │
│   ├── lib/                     # External service clients & utilities
│   │   ├── supabase.ts          # Supabase client (singleton, HMR-safe)
│   │   ├── copy.ts              # Canonical UX copy strings
│   │   ├── topicBlocks.ts       # Topic encoding/decoding utilities
│   │   ├── generatePptx.ts      # PowerPoint generation (pptxgenjs)
│   │   └── utils.ts             # General utilities (cn, etc.)
│   │
│   ├── types/                   # TypeScript definitions
│   │   └── index.ts             # All types (Session, Theme, Response, etc.)
│   │
│   ├── config/                  # App configuration
│   │   └── index.ts             # Environment variables
│   │
│   ├── App.tsx                  # Root component + routing (data router)
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles (Tailwind base)
│
├── supabase/                    # Database configuration
│   ├── schema.sql               # Table definitions
│   ├── rls-policies.sql         # Row Level Security policies
│   └── MIGRATION.sql            # Migration scripts
│
├── e2e/                         # End-to-end tests (Playwright)
├── public/                      # Static assets
├── .env.example                 # Environment template
├── .gitignore                   # Security (includes .env)
├── eslint.config.js             # ESLint 9 flat config
├── playwright.config.ts         # Playwright E2E config
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── vercel.json                  # Vercel deployment config
└── README.md
```

### Key Principles

1. **Feature-based organization** - Code grouped by user journey, not file type
2. **Hooks for data** - All database/API operations through hooks
3. **Components for UI** - Presentational components in `/components`
4. **Types are first-class** - Explicit types for all data shapes
5. **Services isolated** - External integrations in `/lib`

---

## Styling Guidelines

### Use Tailwind Classes Directly

Tailwind's utility classes ARE the design system. No custom token files needed.

**Color preferences:**
- Backgrounds: `bg-white`, `bg-gray-50` (not pure white everywhere)
- Text: `text-gray-900` (primary), `text-gray-600` (secondary), `text-gray-400` (muted)
- Accent: `bg-violet-600`, `hover:bg-violet-700`
- Borders: `border-gray-200`

**Spacing:** Use Tailwind's scale (`p-4`, `m-2`, `gap-3`, etc.)

**Border radius:** `rounded-lg` (12px) for cards, `rounded-md` (8px) for inputs

### Touch Targets

```typescript
// Minimum 48px for all interactive elements
<button className="min-h-[48px] min-w-[48px] ...">

// Primary actions should be larger (56px)
<button className="min-h-[56px] px-6 ...">
```

### Loading & Empty States

- **Loading:** Use shadcn Skeleton component
- **Empty:** Message + helpful CTA
- **Error:** User-friendly message + retry button

### Transitions

Add to all interactive elements:
```
className="transition-all duration-200 ease-in-out"
```

---

## Configuration

### Central Config File

All runtime configuration in one place:

**`src/config/index.ts`:**
```typescript
interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
  env: 'development' | 'production';
}

export const config: AppConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  appUrl: import.meta.env.VITE_APP_URL ?? 'http://localhost:5173',
  env: import.meta.env.PROD ? 'production' : 'development',
};
```

> **Note:** OpenAI and Resend integrations are planned for future versions. They will use Supabase Edge Functions with server-side secrets rather than client-exposed env vars.

// Validation (fail fast in development)
if (config.env === 'development') {
  const required = ['supabaseUrl', 'supabaseAnonKey'] as const;
  for (const key of required) {
    if (!config[key]) {
      console.warn(`⚠️ Missing required config: ${key}`);
    }
  }
}
```

**Rule:** Never hardcode URLs, keys, or environment-specific values. Always read from `config`.

### Security Note: Future API Keys

OpenAI and Resend integrations are planned for future versions. When implemented:
- API keys will be stored in Supabase Edge Functions (server-side)
- Never expose API keys in frontend environment variables
- Use Vercel/Supabase serverless functions for AI calls

---

## Core Concepts

### 1. Session States

Sessions follow a strict state machine:

```
                              ┌────────┐    presenter     ┌───────────┐    presenter    ┌──────────┐
      (Wizard creates) ─────▶ │ ACTIVE │ ────clicks────▶ │ COMPLETED │ ───clicks────▶ │ ARCHIVED │
                              └────────┘                  └───────────┘                 └──────────┘
                                  │                            │                            │
                                  │                            │                            │
                                  ▼                            ▼                            ▼
                            Presenter can:              Presenter can:               Presenter can:
                            - Edit Working version      - View results               - View (read-only)
                            - Publish updates           - Export outline             - Use as template
                            - Discard changes           - Move to archived           - Delete
                            - View responses            - Delete
                            - Close voting
                            - Delete

                            Participants:               Participants:                Participants:
                            - See Live version          - See Live version           - See "closed" message
                            - Can respond               - Voting disabled
                            - Can edit response         - Content still visible
```

**Current Flow (v0.1.3+):**
- Wizard creates presentations directly as Active with published snapshot
- No Draft state in normal flow (schema supports it but UI bypasses)
- Active → Completed: Presenter clicks "Close participant voting"
- Completed → Archived: Explicit presenter action only
- Archived → Active: "Use as template" creates NEW active session (copies summary/topics, removes responses)

### 2. Working vs Live Model (Active State)

**Purpose:** Allow presenters to edit sessions while Active without disrupting participant experience.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      SESSION (Active State)                      │
├──────────────────────────────┬──────────────────────────────────┤
│      WORKING VERSION         │        LIVE VERSION              │
│   (Presenter edits)          │   (Participants see)             │
├──────────────────────────────┼──────────────────────────────────┤
│ welcome_message              │ published_welcome_message        │
│ summary_condensed            │ published_summary_condensed      │
│ themes table (rows)          │ published_topics (JSONB array)   │
│                              │ published_at (timestamp)         │
│ has_unpublished_changes      │                                  │
└──────────────────────────────┴──────────────────────────────────┘
```

**Database Schema:**

```sql
ALTER TABLE sessions ADD COLUMN published_welcome_message TEXT;
ALTER TABLE sessions ADD COLUMN published_summary_condensed TEXT;
ALTER TABLE sessions ADD COLUMN published_topics JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE sessions ADD COLUMN published_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN has_unpublished_changes BOOLEAN NOT NULL DEFAULT false;
```

**Published Topics Format:**

```typescript
interface PublishedTopic {
  themeId: string;    // Links to themes.id for selections continuity
  text: string;       // Topic display text
  sortOrder: number;  // Display order
}
```

**Publish Workflow:**

1. Presenter edits Working fields → `has_unpublished_changes = true`
2. UI shows amber "Updates pending" badge
3. Presenter clicks "Publish updates" →
   - Fetch working themes from `themes` table
   - Map to `published_topics` JSONB format
   - Update session: copy Working → Live fields
   - Set `has_unpublished_changes = false`
4. Participants see updated Live version on next page load

**Discard Workflow:**

1. Presenter clicks "Discard changes" →
   - Revert Working fields to Live fields
   - Reconcile `themes` table to match `published_topics`
   - Set `has_unpublished_changes = false`
2. Working version restored to last published state

**UX Guardrails:**

- **Navigate away:** Modal confirmation if unpublished changes exist
- **View live version:** Link in unpublished changes bar opens participant URL
- **Active reassurance:** "Feedback collection stays on while you edit"
- **Status row:** Shows "Participant view: Live" + "Edits: Working · [Up to date | Unpublished updates]"
- **Edited indicators:** Amber pills next to changed sections

**Canonical Copy:** All UX strings defined in `src/lib/copy.ts`

### 3. Theme Interest Model

Participants indicate interest using a three-state model per theme:

| State | User Action | Database Value | Display |
|-------|-------------|----------------|---------|
| More Interested | Tap 👍 | `'more'` | Filled thumb up |
| Less Interested | Tap 👎 | `'less'` | Filled thumb down |
| Neutral | No tap | No row | Empty thumbs |

**Aggregation:**
```
Net Interest = (more_count) - (less_count)
Themes sorted by net interest descending
```

### 3. AI Generation Pipeline

```
Summary Input
    │
    ▼
┌─────────────────┐
│ Theme Generator │ ──▶ 5-10 themes (based on session length)
│   (GPT-4o)      │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Title Generator │ ──▶ Session title
│   (GPT-4o)      │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│Welcome Generator│ ──▶ Participant welcome message
│   (GPT-4o)      │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Slug Generator  │ ──▶ Readable URL slug
│   (GPT-4o)      │
└─────────────────┘

[After responses collected]

Responses
    │
    ▼
┌─────────────────┐
│Spotlight Finder │ ──▶ Unique/interesting suggestions
│   (GPT-4o)      │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│WriteIn Summarize│ ──▶ Grouped free-form summary
│   (GPT-4o)      │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│Outline Generator│ ──▶ Sections + sub-points
│   (GPT-4o)      │
└─────────────────┘
```

### 4. Feedback Synthesis v1 (Deck Builder)

The Deck Builder feature synthesizes participant feedback into a prioritized presentation outline.

#### Feedback Lifecycle

```
ACTIVE (feedback open)
    │
    ├─▶ responseCount === 0 → Confirm dialog → Stay on Dashboard
    │
    └─▶ responseCount >= 1 → Close feedback → Redirect to Results + Deck Builder
            │
            ▼
COMPLETED (feedback closed)
    │
    └─▶ Participant link hidden, status shows "Participant feedback closed"
```

#### Interest Scoring

Each proposed topic receives an interest score based on participant signals:

```
score = cover_more_count − cover_less_count
```

| Score Range | Label | Display |
|-------------|-------|---------|
| score >= +1 | High interest | Green badge |
| score == 0 | Neutral | Gray badge |
| score <= -1 | Low interest | Red badge + guidance text |

**Key behaviors:**
- Interest is computed server-side at outline generation time (`api/generate-outline.ts`)
- Slides are matched to themes via fuzzy text matching (title substring or word overlap)
- Interest data persists through slide title edits (spread operator preserves properties)
- Interest does NOT re-compute unless "Regenerate Outline" is clicked

#### AI Outline Behavior

The AI prioritizes and annotates the presenter's proposed outline. It does NOT:
- Auto-delete low-interest sections
- Reorder beyond natural flow
- Remove content without presenter action

**Design rationale:**
- "Cover less" ≠ automatic removal. Participants may signal lower priority, but the presenter knows context the audience doesn't.
- Presenter judgment remains final. The tool provides signals, not decisions.
- Low-interest sections show guidance: "Consider removing — participants signaled lower interest in this topic."

#### PPTX Generation

- Generates from the final edited outline only
- Interest labels and guidance text are NOT included in slides
- Presenter name and deck title included in metadata

#### Known v1 Limitations

1. Interest matching uses fuzzy text at generation time only
2. Subsequent title edits preserve labels but don't re-match
3. If themes don't fuzzy-match any slide, no interest data appears
4. Single-response sessions work but provide limited signal diversity

### 5. File Upload Flow

```
User selects file
    │
    ├─▶ PDF ──▶ pdf-parse library ──▶ extracted text
    ├─▶ Word ──▶ mammoth library ──▶ extracted text
    └─▶ PPT ──▶ pptx library ──▶ extracted text
         │
         ▼
    On parse error:
    - Show what could be extracted
    - Offer manual paste fallback
         │
         ▼
    Extracted text → Summary editor
```

---

## Data Flow

### Presenter Flow

```
Homepage (/login)
    │
    ▼
Enter email ──▶ Resend magic link ──▶ Email received
    │
    ▼
Click link ──▶ /auth/callback?token=xxx
    │
    ├─▶ [First time] ──▶ ProfileSetup ──▶ Save presenter
    │
    └─▶ [Returning] ──▶ Dashboard
                           │
                           ├─▶ Create new ──▶ SessionCreate wizard
                           │                        │
                           │                        ▼
                           │                   Generate ──▶ Copy link
                           │
                           ├─▶ View active ──▶ SessionView
                           │                        │
                           │                        ▼
                           │                   Results ──▶ Export
                           │
                           └─▶ Archived ──▶ ArchivedSessions
```

### Participant Flow

```
Shared link (/s/:slug)
    │
    ▼
FeedbackForm.tsx (single component handles all states)
    │
    ├─▶ [Draft state] ──▶ Preview banner, voting disabled
    │
    ├─▶ [Active state] ──▶ Full voting experience
    │       │
    │       ├─▶ Select topics (Cover more/Cover less)
    │       ├─▶ Optional: name, email, freeform text
    │       └─▶ Submit ──▶ "Thank You" confirmation (same component)
    │
    └─▶ [Completed/Archived] ──▶ "Voting closed" banner, content visible
```

**Note:** Email is optional for participants. Anonymous submissions use generated email `anon-{token}@feedbacker.app`.

---

## Component Architecture

### Display Components (Presentational)

| Component | Purpose | Props | Used In |
|-----------|---------|-------|---------|
| `ThemeSelector` | Cover more/Cover less voting | `text`, `selection`, `onSelect`, `disabled` | FeedbackForm |
| `UnpublishedChangesBar` | Publish/discard working changes | `onPublish`, `onDiscard`, `participantUrl` | SessionEdit |
| `ErrorBoundary` | React error boundary | `children` | SessionDetail, SessionEdit |

### Feature Views (Smart Components)

| Component | Purpose | Data Source |
|-----------|---------|-------------|
| `Dashboard` | Session list + create | Direct Supabase queries |
| `ProfileSetup` | First-time profile | Direct Supabase queries |
| `SessionCreateWizard` | Multi-step creation | Local state + Supabase insert |
| `SessionDetail` | Session view + results tabs | Direct Supabase queries |
| `SessionEdit` | Edit working version | Direct Supabase queries + useSessions |
| `DeckBuilderPanel` | AI outline + PPTX export | Props from SessionDetail + API |
| `FeedbackForm` | Participant feedback (all states) | Direct Supabase queries |

### shadcn/ui Components Used

Located in `src/components/ui/`:
- `button`, `card`, `dialog`, `alert-dialog`
- `form`, `input`, `label`, `textarea`
- `tabs`, `dropdown-menu`, `badge`
- `toast`, `toaster`, `skeleton`, `alert`

---

## State Management

### Pattern: Hooks + React Context + Direct Queries

No Redux. Use React's built-in state, custom hooks, and direct Supabase queries.

### Hooks

#### `useSessions` (`src/hooks/useSessions.ts`)
Session CRUD operations and state transitions.

#### `useToast` (`src/hooks/use-toast.ts`)
Toast notification system (shadcn/ui).

### Context Providers

#### `AuthContext` (`src/features/auth/AuthContext.tsx`)
```typescript
{
  user: User | null;           // Supabase auth user
  presenter: Presenter | null; // Presenter profile from DB
  isLoading: boolean;
  signOut: () => Promise<void>;
}
```

### Data Fetching Pattern

Most components fetch data directly from Supabase rather than using centralized hooks:

```typescript
// Example from SessionDetail.tsx
const { data, error } = await supabase
  .from('sessions')
  .select('*, themes(*)')
  .eq('id', sessionId)
  .single();
```

This pattern provides:
- Simpler code with fewer abstractions
- Direct control over query shape
- Easier debugging

---

## External Services

### Supabase (Implemented)

**Tables:**
- `presenters` - Presenter profiles
- `sessions` - Session metadata + published snapshots
- `themes` - Working themes per session
- `responses` - Participant responses
- `theme_selections` - Interest signals per response

**Auth:**
- Magic link via `supabase.auth.signInWithOtp()`
- Session management via `onAuthStateChange`

### pptxgenjs (Implemented)

**Purpose:** PowerPoint generation from Deck Builder outline
**Location:** `src/lib/generatePptx.ts`

### OpenAI (Planned - Not Yet Implemented)

**Planned Model:** `gpt-4o`

**Planned Features:**
- Theme generation from outline
- AI-powered outline prioritization
- Write-in response summarization

**Note:** Currently, topics are manually entered in the wizard. AI generation requires OPENAI_API_KEY in Edge Functions.

### Resend (Planned - Not Yet Implemented)

**Planned Emails:**
1. Magic links (currently handled by Supabase)
2. New response notifications

**Note:** Currently using Supabase's built-in email for magic links.

---

## Database Schema

**IMPORTANT:** See `supabase/schema.sql` for the authoritative schema.

```sql
-- Presenters (users who create sessions)
-- NOTE: id must be supplied by client as auth.uid() - no default
CREATE TABLE presenters (
  id UUID PRIMARY KEY,  -- Must match auth.users.id
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  logo_url TEXT,
  brand_guidelines_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presenter_id UUID NOT NULL REFERENCES presenters(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'active', 'completed', 'archived')),
  length_minutes INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  welcome_message TEXT NOT NULL DEFAULT '',
  summary_full TEXT NOT NULL DEFAULT '',
  summary_condensed TEXT NOT NULL DEFAULT '',
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Themes (generated from summary)
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, sort_order)
);

-- Responses (participant feedback)
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  name TEXT,
  followup_email TEXT,
  free_form_text TEXT,
  participant_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, participant_email)
);

-- Theme Selections (interest signals)
CREATE TABLE theme_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  selection TEXT NOT NULL CHECK (selection IN ('more', 'less')),
  UNIQUE(response_id, theme_id)
);
```

### Security Notes

- **Presenter ID = Auth ID:** The `presenters.id` must equal `auth.uid()`. Profile setup must insert with `id: user.id`.
- **Participant Token:** Each response has a `participant_token` for update verification. Store it client-side (localStorage) after initial submit.
- **MVP Limitations:** See `supabase/rls-policies.sql` for security notes about production improvements.

### Wizard Write Contract

The session creation wizard (`SessionCreateWizard.tsx`) follows these write rules:

**Required Fields:**
- `length_minutes` (integer, must be > 0)
- `title` (string, must be non-empty after trim)
- `slug` (auto-generated 16-char hex string)

**Optional Fields (coerced to empty string):**
- `welcome_message` → `.trim()` (empty string if blank)
- `summary_full` → `.trim()` (empty string if blank)
- `summary_condensed` → `.trim()` (empty string if blank)

**Theme Ordering Rules:**
- `sort_order` is 1-indexed (starts at 1, not 0)
- Reordering updates all affected themes' `sort_order`
- Deleting a theme renumbers remaining themes to maintain contiguous sequence
- Unique constraint: `(session_id, sort_order)` prevents collisions

**Transaction Order:**
1. Insert session (returns `session.id`)
2. Insert themes with `session_id` reference and 1-indexed `sort_order`

**Slug Generation:**
- Format: 16-character random hex (`Math.random().toString(36).slice(2,10)` × 2)
- Unique constraint in schema; client handles collision with retry

### RLS Defense-in-Depth Note

**Observed:** RLS policies allow participant INSERTs for `state IN ('active', 'completed')`, but the application (`FeedbackForm.tsx`) enforces `state === 'active'` only.

**Why This Is Intentional:**
- Application layer is the primary enforcement mechanism
- RLS provides secondary guardrail (never less restrictive than intended)
- Preserves operational flexibility during MVP iteration
- Documented in `docs/SECURITY.md` and `supabase/rls-policies.sql`

---

## API Design

### Route Structure

```
/                              → Login/landing page (LoginPage)
/auth/callback                 → Magic link handler (AuthCallback)
/dashboard                     → Presenter dashboard (Dashboard, protected)
/dashboard/profile             → Profile setup/edit (ProfileSetup, protected)
/dashboard/sessions/new        → Session creation wizard (SessionCreateWizard, protected)
/dashboard/sessions/:sessionId → Session detail + results tabs (SessionDetail, protected)
/dashboard/sessions/:sessionId/edit → Edit active session (SessionEdit, protected)
/s/:slug                       → Participant feedback (FeedbackForm, public)
```

**Note:** Results are shown in the "Audience feedback" tab within SessionDetail, not a separate route.

### Protected Routes

All `/dashboard/*` routes require authenticated presenter.

Use `ProtectedRoute` wrapper:
```typescript
<Route path="/dashboard/*" element={
  <ProtectedRoute>
    <DashboardLayout />
  </ProtectedRoute>
} />
```

---

## Development Guidelines

### Mobile-First (CRITICAL)

Test at these breakpoints in order:
1. **375px** — Phone baseline (MUST work first)
2. **768px** — Tablet
3. **1024px** — Desktop

Requirements:
- Touch targets ≥ 48×48px
- No horizontal scroll
- Readable text without zoom

### TypeScript Rules

- No `any` types
- `unknown` with explicit narrowing only
- Interfaces for all props and data shapes
- Strict mode enabled

### React Patterns

- Navigation: `useNavigate()` only (never `window.location`)
- Auth: `onAuthStateChange` listener (never one-time `getUser()`)
- Async: Always show loading + error states
- Forms: Controlled components

### Toast Notifications

Use shadcn/ui toast (built on Radix UI) for user feedback. The Toaster component is already set up in App.tsx.

**Usage:**
```typescript
import { useToast } from "@/hooks/use-toast"

function MyComponent() {
  const { toast } = useToast()

  const handleSuccess = () => {
    toast({
      title: "Saved!",
      description: "Your changes have been saved.",
    })
  }

  const handleError = () => {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Something went wrong.",
    })
  }
}
```

**Rule:** Never use `alert()`. Always use toast.

### Database Error Translation

Translate database errors to user-friendly messages:

```typescript
// src/utils/db-errors.ts
export const translateDBError = (error: unknown): string => {
  const err = error as { message?: string; code?: string };
  const errorMap: Record<string, string> = {
    '23505': 'This already exists. Please try another.',
    '23503': 'Cannot delete - this is being used elsewhere.',
    'row-level security': 'Permission denied. Please try again.',
    'JWT expired': 'Session expired. Please sign in again.',
  };
  
  for (const [key, message] of Object.entries(errorMap)) {
    if (err.message?.includes(key) || err.code === key) return message;
  }
  return 'Something went wrong. Please try again.';
};
```

### Error Handling

- User-friendly message in UI
- Technical details in console
- Retry option for recoverable errors

### Before Claiming Done

- [ ] Tested at 375px, 768px, 1024px
- [ ] Zero console errors
- [ ] Loading states for all async
- [ ] Error states for all async
- [ ] No `any` types
- [ ] Touch targets ≥ 48px

---

## Auth Model + RLS Summary

### Authentication Flow

```
User enters email → Supabase sends magic link → User clicks link
                            ↓
              /auth/callback processes token
                            ↓
        New user? → /dashboard/profile (create presenter record)
        Returning? → /dashboard (load sessions)
```

### Row-Level Security (RLS) Overview

| Table | Presenter Access | Participant Access |
|-------|-----------------|-------------------|
| `presenters` | Own profile only (by `id = auth.uid()`) | None |
| `sessions` | Own sessions (by `presenter_id`) | Active/completed sessions (public read) |
| `themes` | Own session themes (via session join) | Active session themes (public read) |
| `responses` | Own session responses (via session join) | Can insert for active sessions |
| `theme_selections` | Own session selections (via response join) | Can insert/delete for active sessions |

### Critical Invariant

**Presenter ID must equal auth.uid()**

When creating a presenter record, always set `id: user.id`:

```typescript
await supabase.from('presenters').insert({
  id: user.id,  // MUST match auth.uid()
  email: user.email,
  name: formData.name,
  organization: formData.organization,
});
```

This ensures RLS policies work correctly.

### Supabase Client Configuration

The Supabase client uses a singleton pattern with Navigator Lock disabled for Vite HMR compatibility:

```typescript
// src/lib/supabase.ts
// - Navigator Lock API disabled to prevent AbortError during HMR
// - Singleton with version control for config changes
// - Session persisted to localStorage
```

See `PROGRESS.md` Troubleshooting section for details on the Navigator Lock fix.

---

## Appendix: Type Definitions

See `/src/types/` for complete definitions.

### Core Types Preview

```typescript
// Session states
type SessionState = 'draft' | 'active' | 'completed' | 'archived';

// Theme selection
type ThemeSelection = 'more' | 'less';

// Presenter profile
interface Presenter {
  id: string;
  email: string;
  name: string;
  organization: string;
  logoUrl?: string;
  brandGuidelinesUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Session
interface Session {
  id: string;
  presenterId: string;
  state: SessionState;
  lengthMinutes: number;
  title: string;
  welcomeMessage: string;
  summaryFull: string;
  summaryCondensed: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

// Theme
interface Theme {
  id: string;
  sessionId: string;
  text: string;
  sortOrder: number;
}

// Response
interface Response {
  id: string;
  sessionId: string;
  participantEmail: string;
  name?: string;
  followupEmail?: string;
  freeFormText?: string;
  participantToken: string;
  selections: ThemeSelectionRecord[];
  createdAt: Date;
  updatedAt: Date;
}

// Theme selection record
interface ThemeSelectionRecord {
  themeId: string;
  selection: ThemeSelection;
}

// Aggregated theme (for results)
interface AggregatedTheme {
  theme: Theme;
  moreCount: number;
  lessCount: number;
  netInterest: number;
}

// Generated outline
interface Outline {
  sections: OutlineSection[];
  generatedAt: Date;
}

interface OutlineSection {
  title: string;
  subPoints: string[];
}
```

---

*End of Architecture Documentation*
