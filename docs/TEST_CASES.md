# Test Cases for Wizard + Participant Flow

## Purpose
Verify that outline parsing, sub-bullets, participant preview, and mobile UX work as specified.

---

## Test Case 1: Plain Text (No Bullets)

**Input (Step 2 outline):**
```
Context

Problem

Solution
```

**Expected Step 3 Result:**
- 3 topics: "Context", "Problem", "Solution"
- 0 details on any topic
- Topics appear automatically (no button click)

**Participant View:**
- 3 topics displayed
- No details shown under any topic

---

## Test Case 2: Bullets with Sub-Bullets

**Input (Step 2 outline):**
```
- Market context
  - why now
  - why later

- Proposed approach
  - steps
  - tradeoffs
```

**Expected Step 3 Result:**
- 2 topics: "Market context", "Proposed approach"
- "Market context" has 2 details: "why now", "why later"
- "Proposed approach" has 2 details: "steps", "tradeoffs"
- Details shown as `— detail` in gray text under each topic

**Participant View:**
- 2 topics with voting controls
- Details visible as context under each topic
- Details are NOT votable (no controls on details)

---

## Test Case 3: Mixed Dash Details

**Input (Step 2 outline):**
```
Market context
— why now
— why later

Case study
- what happened
- what we learned
```

**Expected Step 3 Result:**
- 2 topics: "Market context", "Case study"
- "Market context" has 2 details: "why now", "why later"
- "Case study" has 2 details: "what happened", "what we learned"

**Participant View:**
- 2 topics votable
- 4 total details shown as context

---

## Test Case 4: Complex Outline (Real-World Example)

**Input (Step 2 outline):**
```
Introduction
  - team intros
  - agenda overview

Current state analysis
  - market conditions
  - competitive landscape
  - customer feedback summary

Proposed solution
  - architecture
  - timeline
  - resource requirements

Q&A
```

**Expected Step 3 Result:**
- 4 topics: "Introduction", "Current state analysis", "Proposed solution", "Q&A"
- "Introduction" has 2 details
- "Current state analysis" has 3 details
- "Proposed solution" has 3 details
- "Q&A" has 0 details

**Participant View:**
- 4 votable topics
- 8 total details shown as context

---

## Wizard Flow Verification

### Step 1: Basics
- ✅ Title field
- ✅ Length dropdown

### Step 2: Welcome + Overview + Outline
**Copy verification:**
- [ ] CardDescription mentions "welcome message, overview, and outline"
- [ ] CardDescription says "Next, you'll review the topics we organize from it"
- [ ] NO "AI", "generate", "extract", "regenerate" language

**Suggested welcome message:**
- [ ] Gray box appears when welcome field is empty
- [ ] Suggested text: "Hi — please review the topics below and tell me which ones you'd like more time on and which ones matter less. Thank you for your feedback."
- [ ] "Use suggested message" button fills field
- [ ] Box disappears after filling

**Field order:**
1. Welcome message (with suggestion)
2. Overview summary (optional)
3. Outline (required)

**Helpers:**
- [ ] Welcome helper: "Appears at the top of the participant page."
- [ ] Outline helper: "Write your outline. We'll organize it into topics your audience will prioritize."

### Step 3: Topics
**Copy verification:**
- [ ] Headline: "Review the topics your audience will prioritize"
- [ ] Subcopy: "We organized your outline into topics. Review wording and order, then add or remove topics."
- [ ] NO "Extract" or "Generate" buttons
- [ ] Topics already populated on page load

**Topic display:**
- [ ] Each topic shows text + details underneath
- [ ] Details formatted as `— detail` in gray
- [ ] Reorder controls visible
- [ ] Delete button per topic
- [ ] "Add topic" control available

### Step 4: Review & Create
- [ ] Shows session summary
- [ ] "Confirm & create session" button (not "Generate" or "Extract")

---

## Session Detail Verification

### Draft State
**Link status (prominent pill badge):**
- [ ] Shows "Draft — preview only"
- [ ] Amber background (amber-100)
- [ ] Amber text (amber-800)
- [ ] Rounded-full pill shape
- [ ] `text-sm` font size (not text-xs)
- [ ] Impossible to miss

**Activation panel:**
- [ ] Panel visible with amber background
- [ ] Copy: "Feedback collection starts after you confirm & save."
- [ ] Button: "Confirm & start collecting feedback"
- [ ] Helper: "This keeps the same participant link. The page becomes interactive."

### Active State
**Link status (prominent pill badge):**
- [ ] Shows "Active — collecting feedback"
- [ ] Green background (green-100)
- [ ] Green text (green-800)
- [ ] Rounded-full pill shape
- [ ] `text-sm` font size (not text-xs)
- [ ] Impossible to miss

**Action:**
- [ ] "Close Session" button visible

**Edit affordance:**
- [ ] "Edit Session" button visible in header
- [ ] Primary styling (solid background)
- [ ] 48px min-height

---

## Edit Session Page Verification

**Navigation:**
- [ ] Clicking "Edit Session" navigates to `/dashboard/sessions/:sessionId/edit`
- [ ] Page loads without error

**Data loading:**
- [ ] Welcome message pre-filled with current value
- [ ] Overview summary pre-filled with current value
- [ ] Outline pre-filled with current value
- [ ] Topics displayed (read-only for now)

**Save behavior:**
- [ ] "Save Changes" button updates working fields
- [ ] Sets `has_unpublished_changes = true`
- [ ] Toast confirmation: "Your edits are saved as working version. Publish to make them live."
- [ ] Navigates back to SessionDetail after save

**UI notes:**
- [ ] Topics section shows: "Topic editing coming soon. For now, you can edit text fields above."
- [ ] Cancel button returns to SessionDetail
- [ ] 48px touch targets throughout

---

## Participant Page — Draft Preview

**Content visibility:**
- [ ] Welcome message visible
- [ ] Overview summary visible (if present)
- [ ] Topics list visible
- [ ] Details visible under each topic

**Controls disabled:**
- [ ] Topic voting buttons disabled
- [ ] Submit button disabled

**Banner:**
- [ ] Visible at top
- [ ] Copy: "Session draft"
- [ ] Secondary copy: "Preview only. Feedback collection starts after the presenter confirms and saves."
- [ ] Mobile-safe (wraps cleanly at 375px)

---

## Participant Page — Active

**Content:**
- [ ] Welcome message visible
- [ ] Overview summary visible
- [ ] Topics list visible
- [ ] Details visible as context under topics

**Controls enabled:**
- [ ] Topic voting buttons work (Cover more / Cover less)
- [ ] Submit button enabled
- [ ] Form submission works

**No banner:**
- [ ] Draft banner removed after activation

---

## UnpublishedChangesBar Verification

**Visibility:**
- [ ] Shows when `has_unpublished_changes = true`
- [ ] Shows in Draft or Active states only

**Content:**
- [ ] Title: "Updates ready to publish"
- [ ] Body explains working vs live
- [ ] Active reassurance: "Feedback collection stays on while you edit."

**Actions:**
- [ ] "Discard changes" button
- [ ] "Publish updates" button (amber)
- [ ] "View live version" link (opens participant link)

---

## Mobile Verification (375px Width)

### Wizard Step 2
- [ ] Suggested message box wraps cleanly
- [ ] Outline placeholder doesn't overflow
- [ ] All helper text wraps
- [ ] No horizontal scroll

### Wizard Step 3
- [ ] Topic text wraps
- [ ] Details wrap under topics
- [ ] Controls don't get clipped
- [ ] Add topic button full width on mobile

### SessionDetail - Mobile Hierarchy (375px)

**Sticky top bar:**
- [ ] Back link (icon + "Dashboard") on left
- [ ] Overflow menu (⋯) on right
- [ ] Bar stays visible on scroll
- [ ] No horizontal overflow

**Header area:**
- [ ] Title wraps properly
- [ ] State badge visible next to title
- [ ] Minimal metadata: "10 min • Created Jan 21"
- [ ] No "Participant view" or "Edits" clutter

**Primary action block (Draft):**
- [ ] "Edit session" button full width
- [ ] Subtext below button
- [ ] Separate from activation block

**Draft activation block:**
- [ ] Amber background, amber border
- [ ] "Draft — preview only" badge
- [ ] "Confirm & start collecting feedback" button
- [ ] Clear separation from edit block

**Primary action block (Active):**
- [ ] "Copy participant link" primary button
- [ ] "Open participant page" secondary button
- [ ] Live status card below with response count

**Participant link section:**
- [ ] URL with Copy button
- [ ] "Preview/Open participant page" link
- [ ] URL breaks properly (break-all)

**Details accordion:**
- [ ] Collapsed by default
- [ ] Click to expand
- [ ] Shows: Session ID, Slug, Edits status, Last published
- [ ] ChevronDown rotates on open

**Tabs:**
- [ ] Active sessions default to "Audience feedback" tab
- [ ] Other states default to "Session details" tab

### Participant Draft Banner
- [ ] Banner copy wraps cleanly
- [ ] No text clipped
- [ ] Readable on phone

### UnpublishedChangesBar
- [ ] Content wraps to multiple lines
- [ ] Buttons stack on mobile
- [ ] "View live version" link readable

### Edit Profile Page
- [ ] Form fields display properly
- [ ] "Back to Dashboard" button visible and tappable when editing existing profile
- [ ] Submit button spans full width
- [ ] No horizontal scroll

### Edit Session Page
- [ ] Header buttons stack vertically on mobile
- [ ] Topic list items don't overflow
- [ ] Edit/Delete buttons accessible on topics
- [ ] Save/Cancel buttons span full width

---

## Error Boundary Verification

**To test error boundary:**
1. Temporarily add `throw new Error('Test error')` to SessionEdit or SessionDetail
2. Navigate to the page
3. Verify:
   - [ ] Error card shows "Something went wrong"
   - [ ] "Try again" button visible and clickable
   - [ ] "Back to Dashboard" button visible and clickable
   - [ ] Technical details expandable
   - [ ] Console shows error details
4. Remove test error and verify normal operation

---

## "Creation Failed" Diagnosis

**If session creation fails:**

1. **Open browser DevTools console**
2. **Look for log:** `[SessionCreateWizard] Session insert failed:`
3. **Capture entire error object:**
   ```javascript
   {
     error: {
       code: "...",
       message: "...",
       details: "...",
       hint: "..."
     },
     wizardData: {
       title: "...",
       lengthMinutes: ...,
       welcomeMessageLength: ...,
       summaryFullLength: ...,
       summaryCondensedLength: ...,
       themesCount: ...
     }
   }
   ```
4. **Also check for:** `[SessionCreateWizard] Themes insert failed:`

**Common root causes to investigate:**
- RLS policy denies insert (check `presenter_id` matches `user.id`)
- `published_topics` JSONB shape mismatch
- Missing required columns or constraint violations
- Session insert succeeds but themes insert fails (orphaned session)
- Slug uniqueness violation

---

## Success Criteria

**All must pass:**
- [ ] Test Cases 1-4 produce expected results
- [ ] Wizard copy has zero AI/generation language
- [ ] Suggested welcome message works
- [ ] Sub-bullets never become standalone topics
- [ ] Draft preview shows content with disabled controls
- [ ] Active voting works end-to-end
- [ ] Edit Session loads and saves to working version
- [ ] Mobile UX has no overflow at 375px
- [ ] If "Creation failed" occurs, error object captured and root cause identified

**Baseline preservation:**
- [ ] Working vs Live model intact
- [ ] Publish/Discard flow works
- [ ] Participant always sees published version until publish
