# Feedbacker App — Development Plan

**Last Updated:** January 18, 2026

---

## Speed Principle

If choosing between "perfect" and "done today," choose done.
We'll iterate after users try it.

---

## Phase 1: Foundation (Days 1-2) ✅ COMPLETE

### Day 1: Project Initialization ✅

- [x] Initialize Vite + React + TypeScript
- [x] Install Tailwind CSS
- [x] Install and configure shadcn/ui
- [x] Set up folder structure (feature-based)
- [x] Create `.env` from `.env.example`
- [x] Verify dev server runs at 375px
- [x] ESLint 9 flat config created
- [x] Build passing

### Day 2: Supabase + Types ✅

- [x] Create Supabase project
- [x] Run database schema SQL
- [x] Configure RLS policies
- [x] Set up Supabase client (`src/lib/supabase.ts`)
- [x] Create TypeScript types from schema
- [x] Test database connection

---

## Phase 2: Auth (Days 3-4) ✅ COMPLETE

### Day 3: Magic Link Auth ✅

- [x] AuthContext with onAuthStateChange listener
- [x] Magic link request flow
- [x] /auth/callback handler
- [x] ProtectedRoute component
- [x] Basic login page

### Day 4: Profile Setup ✅

- [x] Profile form component
- [x] Profile creation on first login (with correct id = auth.uid())
- [ ] Profile edit capability
- [ ] Logo upload (Supabase Storage)
- [x] Redirect logic (new user → profile, returning → dashboard)

---

## Phase 3: Presenter Features (Days 5-8) 🔄 NEXT

### Day 5: Dashboard Shell

- [ ] Dashboard layout
- [ ] Empty state
- [ ] Session list (active/archived tabs)
- [ ] "Create New Session" button

**Cascade prompt:**
```
Read .windsurfrules and docs/contract.md first.

Task: Create the presenter dashboard:
1. Create src/features/presenter/Dashboard.tsx
   - Show empty state when no sessions
   - List sessions when they exist (active first, then by date)
   - Include "Create New Session" button
2. Add proper loading and error states
3. Test at 375px, 768px, 1024px

Check contract.md completion criteria before saying done.
```

### Day 6: Session Creation Wizard (Steps 1-2)

- [ ] Wizard container with step navigation
- [ ] Step 1: Session length input
- [ ] Step 2: Summary input (text + file upload)
- [ ] localStorage recovery for wizard state

### Day 7: Session Creation Wizard (Steps 3-4)

- [ ] AI generation integration
- [ ] Step 3: Review/edit generated content
- [ ] Step 4: Copy shareable link
- [ ] State transition: draft → active

### Day 8: Results View

- [ ] Results page layout
- [ ] Individual responses tab
- [ ] Aggregated themes tab
- [ ] Export functionality

---

## Phase 4: Participant Features (Days 9-10)

### Day 9: Feedback Form

- [ ] Participant access page (/s/:slug)
- [ ] Email entry
- [ ] Theme display with selection buttons
- [ ] Form submission

### Day 10: Polish + Edge Cases

- [ ] Returning participant (pre-fill)
- [ ] Invalid/archived slug handling
- [ ] Session closed message
- [ ] Thank you confirmation

---

## Phase 5: AI Features (Days 11-12)

### Day 11: Generation Functions

- [ ] Theme generation
- [ ] Title/welcome/slug generation
- [ ] Condensed summary

### Day 12: Results AI

- [ ] Spotlight generation
- [ ] Write-in summary
- [ ] Outline generation

---

## Phase 6: Polish (Days 13-14)

### Day 13: Mobile Polish

- [ ] Full 375px audit
- [ ] Touch target verification
- [ ] Scroll behavior
- [ ] Keyboard handling

### Day 14: Launch Prep

- [ ] Error boundaries
- [ ] Loading states audit
- [ ] Environment variable verification
- [ ] Deploy to Vercel

---

## Backlog (Post-Launch)

- [ ] Email notifications (Resend)
- [ ] Session reminders
- [ ] Batch session creation
- [ ] Analytics dashboard
- [ ] Custom branding preview
- [ ] Profile edit page
- [ ] Logo upload to Supabase Storage

---

## Completed ✅

### Phase 1: Foundation
- Vite + React + TypeScript initialized
- Tailwind CSS v3 configured (ESM import for animate plugin)
- shadcn/ui components installed (button, card, dialog, form, input, label, toast, skeleton, tabs, dropdown-menu, alert, textarea)
- Feature-based folder structure created
- ESLint 9 flat config
- Build passing

### Phase 2: Auth & Database
- Supabase project created
- Database schema deployed with security fixes
- RLS policies deployed with MVP limitations documented
- AuthContext with onAuthStateChange listener
- Magic link login flow
- /auth/callback handler
- ProtectedRoute component
- ProfileSetup page (id = auth.uid() pattern)

### Setup & Configuration
- GitHub repo created (private): https://github.com/ALehav1/feedbacker-app
- Dev server port locked to 5173 (strictPort: true)
- Naming consistency: "Feedbacker App" across all docs
- Security documentation (docs/SECURITY.md)

---

## Notes

### Key Decisions Made

1. **Magic link over OAuth:** Simpler, no third-party auth dependencies
2. **shadcn over custom components:** AI can edit, accessible by default
3. **Manual refresh over real-time:** Simpler, less infrastructure
4. **Feature folders over type folders:** Scales better, easier to navigate
5. **Presenter ID = Auth ID:** Critical for RLS policies to work

### Critical Invariants (DO NOT VIOLATE)

1. **Presenter ID must equal auth.uid()** - Always set `id: user.id` when inserting presenter
2. **Dev server port 5173** - Locked via strictPort, required for auth redirects
3. **Session state machine** - draft → active → completed → archived (no skipping)
4. **Theme selection model** - more/less/neutral (no both)

### Things to Remember

- Always test at 375px FIRST
- Check contract.md before saying "done"
- Update agents.md when state changes significantly
- Commit after each successful feature
- Use Tailwind utilities consistently (not shadcn CSS variables)
