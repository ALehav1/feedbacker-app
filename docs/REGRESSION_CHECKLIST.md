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
- [ ] Open `/s/:slug` link (while session is `active`)
- [ ] Enter email
- [ ] Select themes (👍/👎)
- [ ] Optional: enter name, email, free-form text
- [ ] Submit
- [ ] See "Thank you" message

### 7. Results View
- [ ] Navigate to session detail
- [ ] Click "Results" tab
- [ ] See theme leaderboard with counts
- [ ] See participant responses list
- [ ] Verify sorting: net desc, total desc, sort_order asc

### 8. Console Check
- [ ] Open browser DevTools console
- [ ] Verify: **Zero errors** during smoke test
- [ ] Warnings are acceptable if pre-existing

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
