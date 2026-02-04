# Supabase Integration — Runtime Contracts

**Last Updated:** February 4, 2026

---

## Auth + Presenter Routing Contract

After Supabase `getSession()` resolves, the app fetches the presenter profile via `.maybeSingle()`. The result is exposed as `presenterStatus` from `AuthContext`:

| Status | Meaning | Routing behavior |
|--------|---------|-----------------|
| `loading` | Auth or presenter fetch in progress | Show spinner, wait |
| `ready` | Presenter profile found | Navigate to `/dashboard` |
| `not_found` | User authenticated but no presenter row | Navigate to `/dashboard/profile` (profile setup) |
| `error` | Presenter fetch failed (network, RLS, etc.) | Stay on current route, show "Unable to load profile" with **Retry** and **Continue to Dashboard** buttons |

### Key rules

- **Never redirect on `error`.** The user stays on the current page with retry UI. Redirecting to `/dashboard/profile` on error would force profile setup on users who already have profiles.
- `presenterStatus` is used in: `AuthCallback.tsx`, `LoginPage.tsx`, `ProfileSetup.tsx`, `SessionCreateWizard.tsx`.
- `refetchPresenter()` resets status to `loading` before re-fetching.

### Implementation

- `src/features/auth/AuthContext.tsx` — state machine and fetch logic
- `src/features/auth/AuthCallback.tsx` — post-auth routing with error guard
- `src/features/auth/LoginPage.tsx` — pre-auth routing with retry UI

---

## `.single()` / `.maybeSingle()` Error Classification

### Policy

Distinguish `PGRST116` (no rows on `.single()`) from network, RLS, and unknown errors. Never treat all errors as "not found" — a network failure is not the same as a missing row.

### Classifier

`src/lib/supabaseErrors.ts` exports `classifySupabaseError(error)` which returns:

| Kind | Trigger | Example |
|------|---------|---------|
| `not_found` | PostgREST code `PGRST116` | `.single()` returned 0 rows |
| `rls` | Code `42501` or message contains "permission denied" / "policy" | Row-level security violation |
| `network` | Message contains "failed to fetch", "network", "timeout", "load failed" | Offline, DNS failure, Supabase outage |
| `schema` | Code `42703` / `42P01` or "column does not exist" | Missing column after migration |
| `unknown` | Everything else | Unclassified server error |

### Usage

| File | Context |
|------|---------|
| `src/features/participant/FeedbackForm.tsx` | Session fetch: `not_found` → "Presentation not found", `rls` → "not available", other → retry UI |
| `src/features/sessions/SessionEdit.tsx` | Session/theme fetch: `not_found` → redirect to dashboard, other → inline retry |
| `src/features/sessions/SessionDetail.tsx` | Discard flow: theme lookup classifies errors before deciding to skip vs abort |

---

## `published_summary_full` Column

### Schema declaration

```sql
-- supabase/schema.sql (sessions table)
published_summary_full TEXT,
```

```sql
-- supabase/migrations/add_published_summary_full.sql
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS published_summary_full TEXT;
```

### Verification query

Run in Supabase SQL Editor to confirm the column exists and check its nullability:

```sql
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'published_summary_full';
```

**Expected:** `published_summary_full | YES | null` (nullable, no default).

If the result shows `NOT NULL` with `DEFAULT ''`, that is also acceptable — the app handles both `null` and `''` equivalently via `session.publishedSummaryFull || ''` fallback in the discard handler.

### Publish/discard behavior

- **Publish:** copies `summary_full` → `published_summary_full` (along with other published_* fields)
- **Discard:** restores `published_summary_full` → `summary_full` (reverts working copy to last published state)
- **Wizard create:** sets `published_summary_full` to the initial `summaryFull` value at session creation time

### Implementation

- `src/features/sessions/SessionDetail.tsx` — `handlePublishUpdates` / `handleDiscardChanges`
- `src/features/sessions/SessionCreateWizard.tsx` — initial insert
- `src/hooks/useSessions.ts` — row mapping
- `src/types/index.ts` — `Session.publishedSummaryFull`
