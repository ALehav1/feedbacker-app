# Testing Guide

**Last Updated:** February 2, 2026

---

## Manual Test Checklist

### Auth Flow

| Test | Steps | Expected |
|------|-------|----------|
| Magic link login | Enter email on `/` → Check email → Click link | Redirects to `/auth/callback` → Dashboard or Profile Setup |
| New user flow | First-time login | Redirects to `/dashboard/profile` |
| Returning user flow | User with existing profile | Redirects to `/dashboard` |
| Session persistence | Login → Close tab → Reopen | Session persists, user still logged in |
| Hard refresh | Login → Cmd+Shift+R | Session persists |
| Sign out | Click "Sign Out" | Redirects to `/`, session cleared |

### Presenter Workflow

| Test | Steps | Expected |
|------|-------|----------|
| Dashboard load | Navigate to `/dashboard` | Shows two sections: Active Sessions, Closed Sessions |
| Empty state | No sessions exist | Shows empty state message |
| Create session | Click "Create New Presentation" → Complete wizard → Confirm | Session created directly as `active` with published snapshot |
| Session detail | Click on session card | Shows SessionDetail with "Session details" and "Audience feedback" tabs |
| Copy link | Click "Copy participant link" | Shareable link copied to clipboard (tokenized `?k=` for new sessions; legacy links may be plain `/s/<slug>`) |
| Close feedback | In active, click "Close participant feedback" → Confirm | State changes to `completed` |
| Delete session | In completed, click "Delete" → Confirm | Session permanently deleted |
| Results tab | Click "Audience feedback" tab | Shows Topic Prioritization + Participant Responses + Deck Builder |

### Session Creation Wizard

| Test | Steps | Expected |
|------|-------|----------|
| Wizard load | Navigate to `/dashboard/sessions/new` | Shows Step 1 (Basics) with progress indicator |
| Step indicator | View progress bar | Shows 4 steps: Basics, Messages, Themes, Review |
| Step 1 validation | Click "Next" without filling required fields | Shows validation errors |
| Step 1 complete | Enter length + title → Click "Next" | Advances to Step 2 |
| Step 2 (optional fields) | Leave all fields blank → Click "Next" | Advances to Step 3 (all fields optional) |
| Step 2 with data | Fill welcome/summaries → Click "Next" | Data persists, advances to Step 3 |
| Step 3 add theme | Enter theme text → Click "Add" | Theme added to list with sort_order 1 |
| Step 3 multiple themes | Add 3 themes | Themes appear with sort_order 1, 2, 3 |
| Step 3 edit theme | Click "Edit" on theme → Modify text → Click "Save" | Theme text updated |
| Step 3 delete theme | Click "Delete" on theme | Theme removed, remaining themes reordered |
| Step 3 reorder up | Click ↑ on theme 2 | Theme moves to position 1, sort_order updated |
| Step 3 reorder down | Click ↓ on theme 1 | Theme moves to position 2, sort_order updated |
| Step 3 skip themes | Click "Next" without adding themes | Advances to Step 4 (themes optional) |
| Step 4 review | View Review step | Shows all entered data (basics, messages, themes) |
| Step 4 back navigation | Click "Back" from Step 4 | Returns to Step 3 with data intact |
| Step navigation | Navigate Back through all steps | All form data persists |
| localStorage persistence | Fill Step 1-2 → Refresh page | Data restored from localStorage |
| Exit wizard | Click "Exit" → Confirm | Returns to dashboard, localStorage cleared on next visit |
| Create from wizard | Complete all steps → Click "Create Session" | Session + themes saved to DB, redirects to SessionDetail |
| Themes persisted | Create session with 3 themes → View SessionDetail | Themes appear in correct sort_order |

### Participant Workflow

| Test | Steps | Expected |
|------|-------|----------|
| Access draft session | Visit `/s/{slug}` for draft session | Shows content with "Presentation draft" banner, feedback disabled |
| Access active session | Visit `/s/{slug}` for active session | Shows full feedback form with feedback enabled |
| Access completed session | Visit `/s/{slug}` for completed/archived | Shows content with "Participant feedback is closed" banner, feedback disabled |
| Submit feedback | Select at least one topic → Submit | Response saved, shows "Thank You!" card |
| Anonymous submission | Submit without name/email | Works - system generates `anon-{token}@feedbacker.app` |
| Required selection | Try to submit with no topics selected | Toast error: "Please select at least one topic" |
| Email validation | Enter invalid email format | Toast error: "Please enter a valid email address" |
| Topic selection | Click "Cover more" on topic | Button highlighted, can click "Cover less" to switch |
| Details display | Topics with sub-bullets | Sub-bullets shown as "— detail" under each topic |

### Results Correctness

| Test | Steps | Expected |
|------|-------|----------|
| Theme aggregation | Multiple participants submit → Check Results | Counts match actual submissions |
| Sorting | Themes with different feedback | Sorted by net desc, total desc, sort_order asc |
| Response display | Submit with free-form text | Text appears in Participant Responses section |

---

## SQL Seed Data

Use these queries in Supabase SQL Editor to create test data:

### Create Test Session with Themes

```sql
-- NOTE: Replace YOUR_PRESENTER_ID with actual auth.uid() from presenters table

-- Create a test session
INSERT INTO sessions (presenter_id, state, length_minutes, title, welcome_message, summary_full, slug)
VALUES (
  'YOUR_PRESENTER_ID',
  'active',
  30,
  'Test Session',
  'Welcome to this test session!',
  'This is a test session to verify the feedback system works correctly.',
  'test-session-' || gen_random_uuid()::text
)
RETURNING id, slug;

-- Copy the session_id from above, then create themes
INSERT INTO themes (session_id, text, sort_order) VALUES
  ('SESSION_ID', 'Theme 1: Introduction to the topic', 1),
  ('SESSION_ID', 'Theme 2: Deep dive into details', 2),
  ('SESSION_ID', 'Theme 3: Practical examples', 3),
  ('SESSION_ID', 'Theme 4: Q&A and discussion', 4);
```

### Seed Test Responses

```sql
-- Create test responses for a session
-- Replace SESSION_ID with actual session ID

INSERT INTO responses (session_id, participant_email, name, free_form_text)
VALUES
  ('SESSION_ID', 'test1@example.com', 'Alice', 'Great session idea!'),
  ('SESSION_ID', 'test2@example.com', 'Bob', 'Looking forward to this'),
  ('SESSION_ID', 'test3@example.com', 'Charlie', NULL)
RETURNING id, participant_email;

-- Create theme selections (use response_id and theme_id from above)
INSERT INTO theme_selections (response_id, theme_id, selection) VALUES
  -- Alice: more on theme 1, less on theme 3
  ('RESPONSE_1_ID', 'THEME_1_ID', 'more'),
  ('RESPONSE_1_ID', 'THEME_3_ID', 'less'),
  -- Bob: more on themes 1 and 2
  ('RESPONSE_2_ID', 'THEME_1_ID', 'more'),
  ('RESPONSE_2_ID', 'THEME_2_ID', 'more'),
  -- Charlie: less on theme 4
  ('RESPONSE_3_ID', 'THEME_4_ID', 'less');
```

---

## Verification Queries

### Count Responses per Session

```sql
SELECT
  s.title,
  s.slug,
  COUNT(r.id) as response_count
FROM sessions s
LEFT JOIN responses r ON r.session_id = s.id
GROUP BY s.id
ORDER BY s.created_at DESC;
```

### Theme Interest Summary

```sql
SELECT
  t.text,
  t.sort_order,
  COUNT(CASE WHEN ts.selection = 'more' THEN 1 END) as more_count,
  COUNT(CASE WHEN ts.selection = 'less' THEN 1 END) as less_count,
  COUNT(CASE WHEN ts.selection = 'more' THEN 1 END) -
    COUNT(CASE WHEN ts.selection = 'less' THEN 1 END) as net
FROM themes t
LEFT JOIN theme_selections ts ON ts.theme_id = t.id
WHERE t.session_id = 'SESSION_ID'
GROUP BY t.id
ORDER BY net DESC, (COUNT(CASE WHEN ts.selection = 'more' THEN 1 END) + COUNT(CASE WHEN ts.selection = 'less' THEN 1 END)) DESC, t.sort_order;
```

### Verify RLS is Working

```sql
-- This should only return presenter's own sessions when authenticated
SELECT * FROM sessions;

-- This should return active sessions for anonymous users
SELECT * FROM sessions WHERE state = 'active';
```

---

## Known Dataset Test

**Setup:**
1. Create session with 4 themes
2. Add 5 responses with these selections:

| Participant | Theme 1 | Theme 2 | Theme 3 | Theme 4 |
|-------------|---------|---------|---------|---------|
| P1 | more | more | - | less |
| P2 | more | - | less | less |
| P3 | more | more | more | - |
| P4 | - | more | - | less |
| P5 | less | more | - | - |

**Expected Results (sorted):**

| Theme | More | Less | Total | Net |
|-------|------|------|-------|-----|
| Theme 2 | 4 | 0 | 4 | +4 |
| Theme 1 | 3 | 1 | 4 | +2 |
| Theme 3 | 1 | 1 | 2 | 0 |
| Theme 4 | 0 | 3 | 3 | -3 |

---

## Migration Verification Queries

### Verify `is_active` Column on Themes

```sql
-- Check that is_active column exists and has correct default
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'themes' AND column_name = 'is_active';
-- Expected: is_active | boolean | NO | true
```

### Verify Partial Unique Index

```sql
-- Check that the partial unique index exists on themes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'themes' AND indexname = 'themes_session_sort_active_unique';
-- Expected: CREATE UNIQUE INDEX themes_session_sort_active_unique
--           ON public.themes USING btree (session_id, sort_order) WHERE (is_active = true)
```

### Verify `published_summary_full` Column on Sessions

```sql
-- Check that published_summary_full column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'published_summary_full';
-- Expected: published_summary_full | text | YES
```

---

## Troubleshooting

### Auth Issues

**Symptom:** Spinner never stops on auth callback
**Solution:** Check PROGRESS.md Troubleshooting section for Navigator Lock fix

**Symptom:** Magic link not received
**Solution:** Check spam folder; verify Supabase email settings

### RLS Issues

**Symptom:** "permission denied for table X"
**Solution:** Verify RLS policies applied; check auth.uid() matches presenter_id

### Session State Issues

**Symptom:** Participant can't submit to active session
**Solution:** Verify session state is 'active'; check RLS policy on responses table

---

## Browser Compatibility

Tested on:
- Chrome 120+
- Safari 17+
- Firefox 120+

Mobile:
- iOS Safari
- Chrome for Android

---

**Note:**
- AI theme generation from outline is not yet implemented (requires OPENAI_API_KEY)
- Deck Builder (outline editor + PPTX export) is implemented but AI outline generation requires API configuration
- Topics are currently entered manually in the wizard
