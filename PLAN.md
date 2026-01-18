# Presentation-Prep-Feedbacker — Development Plan

**Last Updated:** January 17, 2026

---

## Speed Principle

If choosing between "perfect" and "done today," choose done.
We'll iterate after users try it.

---

## Phase 1: Foundation (Days 1-2)

### Day 1: Project Initialization

- [ ] Initialize Vite + React + TypeScript
- [ ] Install Tailwind CSS
- [ ] Install and configure shadcn/ui
- [ ] Set up folder structure (feature-based)
- [ ] Create `.env` from `.env.example`
- [ ] Verify dev server runs at 375px

**Cascade prompt:**
```
Read .windsurfrules and docs/contract.md first.

Task: Initialize the project foundation:
1. Create Vite + React + TypeScript project
2. Install Tailwind CSS with default config
3. Initialize shadcn with default settings
4. Add these shadcn components: button, card, dialog, form, input, label, toast, skeleton, tabs, dropdown-menu, alert, textarea
5. Create feature-based folder structure per ARCHITECTURE.md

Verify: Dev server runs, no console errors, test at 375px.
```

### Day 2: Supabase + Types

- [ ] Create Supabase project
- [ ] Run database schema SQL
- [ ] Configure RLS policies
- [ ] Set up Supabase client (`src/lib/supabase.ts`)
- [ ] Create TypeScript types from schema
- [ ] Test database connection

**Cascade prompt:**
```
Read .windsurfrules and docs/contract.md first.

Task: Set up Supabase integration:
1. Create src/lib/supabase.ts with typed client
2. Create src/types/database.ts with all table types per ARCHITECTURE.md schema
3. Create src/types/index.ts re-exporting all types
4. Test: import supabase client, log connection status

Types must match ARCHITECTURE.md exactly. No 'any' types.
```

---

## Phase 2: Auth (Days 3-4)

### Day 3: Magic Link Auth

- [ ] AuthContext with onAuthStateChange listener
- [ ] Magic link request flow
- [ ] /auth/callback handler
- [ ] ProtectedRoute component
- [ ] Basic login page

**Cascade prompt:**
```
Read .windsurfrules and docs/contract.md first.

Task: Implement magic link authentication:
1. Create src/features/auth/AuthContext.tsx
   - Use onAuthStateChange listener (REQUIRED - see agents.md)
   - Expose: user, loading, signIn, signOut
2. Create src/features/auth/ProtectedRoute.tsx
3. Create src/features/auth/LoginPage.tsx
4. Create src/pages/AuthCallback.tsx

Pattern must follow ARCHITECTURE.md auth section exactly.
Test: Enter email → receive magic link → click → authenticated.
```

### Day 4: Profile Setup

- [ ] Profile form component
- [ ] Profile creation on first login
- [ ] Profile edit capability
- [ ] Logo upload (Supabase Storage)
- [ ] Redirect logic (new user → profile, returning → dashboard)

---

## Phase 3: Presenter Features (Days 5-8)

### Day 5: Dashboard Shell

- [ ] Dashboard layout
- [ ] Empty state
- [ ] Session list (active/archived tabs)
- [ ] "Create New Session" button

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

---

## Completed ✅

*Move items here when done*

---

## Notes

### Key Decisions Made

1. **Magic link over OAuth:** Simpler, no third-party auth dependencies
2. **shadcn over custom components:** AI can edit, accessible by default
3. **Manual refresh over real-time:** Simpler, less infrastructure
4. **Feature folders over type folders:** Scales better, easier to navigate

### Things to Remember

- Always test at 375px FIRST
- Check contract.md before saying "done"
- Update agents.md when state changes significantly
- Commit after each successful feature
