# Feedbacker App

## Product Requirements Specification

**Version:** 1.2
**Date:** January 22, 2026

---

## 1. Overview

### 1.1 Problem Statement

Presenters often guess what their audience wants to hear, leading to misaligned presentations. Instead of presupposing interest, presenters should share what they're working on first, let the audience indicate what resonates, then tailor the presentation accordingly.

### 1.2 Solution

A web application that allows presenters to:
1. Share a summary of their work
2. Collect structured feedback on what topics interest their audience
3. Receive a prioritized, AI-generated outline based on aggregated responses

### 1.3 Scope

**In Scope (v1):**
- Multi-presenter platform (reusable tool)
- Session creation, management, archiving
- Participant feedback collection
- AI-generated themes and outlines
- Email-based presenter authentication
- Response notifications

**Out of Scope (v1):**
- Admin dashboard for usage monitoring
- Custom email domain
- Multiple active sessions (simplified for v1)
- Participant visibility into others' responses
- In-app messaging to participants
- Analytics beyond feedback data

---

## 2. User Roles

### 2.1 Presenter

The person creating a session to gather feedback before presenting.

**Profile (saved once, reused across sessions):**
- Name (required)
- Organization (required)
- Logo (optional, image file)
- Brand guidelines (optional, PDF or image)

### 2.2 Participant

The person responding to a session with their interests.

**Identification:**
- Email (required to access session)
- Name (optional)
- Email for follow-up (optional - may differ from access email)

**Rationale:** Low friction entry. Email required to prevent duplicates and enable returning to edit responses. Additional contact info optional since it's low stakes.

---

## 3. Session States & Lifecycle

### 3.1 States

| State | Description | Participant Link | Presenter Actions |
|-------|-------------|------------------|-------------------|
| **Draft** | (Not used in current flow) | N/A | N/A |
| **Active** | Link shared, participant voting open | Works (shows Live version) | Edit Working version, Publish updates, View results, Close participant voting, Delete |
| **Completed** | Participant voting closed, reviewing results | Content visible, voting disabled (banner explains) | View results, Delete |
| **Archived** | (Not currently used in UI) | Shows "closed" message | View (read-only), Delete, Use as template |

**Rationale:** 
- Completed disables voting but keeps content visible — participants can still read the presentation summary and topics, but cannot vote. Banner explains "Participant voting has closed."
- Terminology clarified: "Participant voting" refers to the time-bounded voting window, distinct from "Presentation" content.
- Active sessions use Working vs Live model: presenter edits Working version, participants see Live version (last published snapshot).
- Explicit "Publish updates" action prevents accidental changes to participant experience.
- Archive state exists in schema but Dashboard currently shows only Active and Completed sections.

### 3.2 State Transitions

```
(Wizard creates directly as Active with published snapshot)
Active → Completed (presenter clicks "Close participant voting")
Completed → Archived (not currently implemented in UI)
Archived → Active (use as template - creates new active session with summary/topics, no responses)
Any state → Deleted (permanent removal via Delete button with confirmation)
```

**Current Implementation Note:** The creation wizard now creates presentations directly as Active (skipping Draft state). This simplifies the flow: presenter enters info → reviews topics → clicks "Confirm & Publish" → presentation is immediately live.

**Current Implementation Note:** Dashboard shows two sections:
- "Active Sessions — Participant Voting Open" (state = 'active')
- "Closed Sessions — Participant Voting Closed" (state = 'completed')

Archived state exists in schema but is not actively used in current UI.

### 3.3 Working vs Live Model (Active State Only)

**Purpose:** Allow presenters to edit sessions while Active without disrupting participants.

**Mechanism:**
- **Working fields:** `welcome_message`, `summary_condensed`, `themes` table (presenter edits)
- **Live fields:** `published_welcome_message`, `published_summary_condensed`, `published_topics` JSONB (participants read)
- **Dirty flag:** `has_unpublished_changes` boolean

**Publish workflow:**
1. Presenter edits Working fields → `has_unpublished_changes` set to `true`
2. Amber "Updates pending" badge shown on dashboard and session detail
3. Presenter clicks "Publish updates" → Working fields copied to Live fields, flag set to `false`
4. Participants immediately see updated Live version on next page load

**Discard workflow:**
1. Presenter clicks "Discard changes" → Working fields reverted to Live fields
2. Flag set to `false`, unpublished edits lost

**Guardrails:**
- Navigate away with unpublished changes → modal confirmation
- "View live version" link in unpublished changes bar → opens participant URL
- Active reassurance: "Feedback collection stays on while you edit"

**Participant experience:**
- Always reads `published_*` fields
- Unaffected by presenter's working edits
- No visibility into unpublished changes

### 3.4 Clear and Restart (Draft only - deprecated)

Wipes any test data, keeps summary/topics structure for fresh start.

**Note:** This feature is deprecated in favor of "Use as template" from Archived state.

---

## 4. Presenter Flow

### 4.1 First-Time Setup

1. Enter email on homepage
2. Receive magic link via email
3. Click link → Profile setup screen
4. Enter: Name, Organization
5. Optional: Upload logo (PNG, JPG, SVG), brand guidelines (PDF or image)
6. Save → Dashboard

**Magic Link Expiration:** 1 month

**Rationale:** Magic link over password for simplicity. One month expiration balances security with convenience.

### 4.2 Returning Presenter

1. Enter email on homepage
2. Receive magic link
3. Click link → Dashboard (profile already saved)

### 4.3 Dashboard View

**Header:**
- Title: "Presentation Feedbacker"
- Subtitle: "Get feedback on your proposed presentation topics from prospective participants."
- Edit Profile and Sign Out buttons

**Primary sections:**
1. **Active Sessions — Participant Voting Open**
   - Sessions where state = 'active'
   - "Close voting" button on each tile
   - Empty state: "No active voting sessions." (always shown)

2. **Closed Sessions — Participant Voting Closed**
   - Sessions where state = 'completed'
   - "Delete" button (destructive) on each tile
   - Only shown when closed sessions exist

**Per-session tile:**
- Session title
- State badge ("Voting open" or "Voting closed")
- Duration and response count
- Shareable link with copy button
- Quick actions: "Presentation details" and "Audience feedback"
- State-specific action (Close voting or Delete)

### 4.4 Create New Session

**Two paths:**
- Start from scratch
- Use archived session as template (copies summary/themes, removes responses)

**Creation flow:**

**Step 1: Session Length**
- Free text entry (number of minutes)
- Determines number of themes AI generates:
  - ~20 min → 5 themes
  - ~30 min → 8 themes
  - ~45 min → 10 themes
  - Scale proportionally for other lengths

**Step 2: Summary Input**

Content can be about:
- What the presenter is working on
- What their organization is working on
- A planned presentation topic
- Something presented elsewhere
- An article or write-up

Input methods:
- Free write in text area
- Copy/paste existing content
- Upload file (PDF, PPT, Word)

**File handling:**
- Size limit: 10-25MB (reasonable default)
- Parse and extract text
- On parse error: Show what could be extracted, offer manual fallback

**Google Docs:** No link fetching. Instruct user to copy-paste or export.

**Rationale:** Google OAuth adds complexity for marginal benefit. Copy-paste is simple and reliable.

**Guidance (layered):**

*Default:* Simple hint - "Describe your work in a way that helps people understand what you could talk about"

*Expandable "Need help?" section:*
- Suggested topics to include
- Example summaries to reference
- Suggested structure to follow

*AI-assisted drafting option:* Help the presenter articulate their summary

**Step 3: AI Generation**

AI generates (all editable by presenter):
- Session title
- Welcome message for participants
- Themes (number based on session length)
- Readable URL slug

**Error handling:**
- Auto-retry on failure
- If retry fails: Show user-friendly error with technical details available
- Offer: Retry button or manual entry fallback

**Step 4: Review & Edit**

Presenter can edit all AI-generated content:
- Title
- Welcome message
- Themes (add, remove, reorder, edit)

No preview of participant view needed.

**Step 5: Get Link**

- Display shareable link with readable slug
- Copy to clipboard button
- Session moves to Active state

**URL format:** `[domain]/s/[readable-slug]`

Slug is AI-generated, not editable.

**Rationale:** Editable slugs add complexity with little benefit. AI generates something reasonable.

### 4.5 View Active Session

**Displays:**
- Session details (title, summary, themes)
- Response count ("7 people have responded")
- List of who responded (emails/names)
- Edit button
- Close participant voting button (transitions to completed state)
- Confirmation dialog: "Participants can no longer vote once voting is closed."

**Refresh:** Manual (presenter clicks to update)

**Rationale:** Real-time updates add complexity. Manual refresh is sufficient for this use case.

### 4.6 Edit Active Session

Presenter can edit summary and themes even after sharing and receiving responses.

**No automatic notification to participants** - presenter handles communication outside the app.

**Rationale:** Managing notifications and re-send logic adds complexity. Presenter knows their audience and can email them directly.

### 4.7 View Results (Completed/Archived)

**Six components:**

1. **Individual responses by participant**
   - Each participant's selections and free-form input
   - Email and optional name shown

2. **Aggregated by theme**
   - Each theme with count of "more interested" and "less interested"
   - Sorted by net interest (more minus less)

3. **AI-suggested spotlights**
   - Unique or interesting suggestions AI identifies across all feedback
   - Helps surface great ideas even if only one person mentioned them

4. **Participant write-ins (summarized)**
   - AI summary of all free-form responses
   - Grouped by type: theme requests, questions, general context

5. **Generated outline**
   - Sections with sub-points
   - Based on aggregated feedback prioritization
   - Only generated with 2+ responses

   **Rationale:** With 1 response, there's nothing to aggregate. Just show raw data.

6. **Export options**
   - Copy to clipboard (plain text, markdown)
   - Download as file (PDF, Word, plain text)

### 4.7.1 Deck Builder (Feedback Synthesis v1)

The Deck Builder transforms aggregated feedback into an editable presentation outline.

**Interest Scoring:**

Each proposed topic receives an interest score:
```
score = (# cover more) − (# cover less)
```

Labels:
- **High interest:** score >= +1
- **Neutral:** score == 0
- **Low interest:** score <= -1

**Presenter Controls:**

Low-interest sections are flagged with guidance text but NOT auto-removed:
> "Consider removing — participants signaled lower interest in this topic."

The presenter decides what to keep or remove. Reasons:
- Participants signal preference, not absolute value
- Presenter has context participants lack (dependencies, setup content, etc.)
- "Cover less" means lower priority, not "don't cover"

**Close Feedback Branching:**

When presenter clicks "Close participant feedback":
- **0 responses:** Confirm dialog with options "Keep feedback open" or "Close anyway" → stays on Dashboard
- **≥1 responses:** Close and redirect to Results tab with Deck Builder visible

After closing:
- Participant link section hidden (presenter no longer needs to share)
- Status shows "Participant feedback closed"

**PPTX Export:**

- Generates from the final edited outline
- Interest labels do NOT appear in exported slides
- Presenter name included in metadata

### 4.8 Notifications

**Email notification when:**
- New participant response submitted

**Sender:** Resend default domain (e.g., onboarding@resend.dev)

**Rationale:** Custom domain requires DNS setup. Default is fine for v1; can upgrade later.

### 4.9 Delete Session

**From Closed Sessions (completed state):**
- Delete button with confirmation dialog
- Dialog: "This removes the presentation and all audience feedback."
- Permanent deletion (cascade deletes all responses, themes, selections)

**Archive State:**
- Exists in database schema but not currently used in UI
- Future: Could be added for long-term storage without deletion
- Current approach: Completed state serves as final state before deletion

### 4.10 Delete Session

Permanent removal from any state. No recovery.

---

## 5. Participant Flow

### 5.1 Access Session

1. Open shared link
2. See email entry screen
3. Enter email
4. Access session content

**Email validation:** None (just accept what they enter)

**Rationale:** Low stakes. Verification adds friction without meaningful benefit here.

**Returning participant:** Same email → sees previous response, can edit/update

### 5.2 Session Page Layout

**Components in order:**

1. **Header**
   - Presenter name and organization
   - Logo (if uploaded)
   - Session length (e.g., "30 minute presentation")

2. **Welcome message**
   - AI-generated, presenter-customized

3. **Summary**
   - AI-condensed preview by default
   - "Read more" expands to full summary

4. **Themes - More Interested**
   - List of all themes
   - Each theme has 👍 button
   - Can select multiple

5. **Themes - Less Interested**
   - Same list of themes
   - Each theme has 👎 button
   - Can select multiple

**Interaction:** Tap 👍 = more interested, tap 👎 = less interested, tap nothing = no signal

Cannot select both 👍 and 👎 for same theme.

6. **Free-form field**
   - Single text area
   - Guidance on what to include and to be specific
   - For: theme requests not listed, questions, general context
   - AI parses and categorizes these

7. **Optional contact info**
   - Name field (optional)
   - Email for follow-up (optional)

8. **Submit button**

All fields optional except access email. Nothing blocks submission.

**Rationale:** Busy executives. Lower friction = higher completion rate.

### 5.3 Submission

- Submit button saves response
- Shows simple "Thank you" message
- No email confirmation
- No summary of what they submitted

**Rationale:** Keep it simple. They can return to the link to see/edit their response.

### 5.4 Returning to Edit

- Same link, same email
- Shows previous response pre-filled
- Can modify and re-submit

### 5.5 Archived Session

If session is archived:
- Link shows "This session is closed"
- No other information or contact details

---

## 6. Visual Design & Branding

### 6.1 Default Design

Standard, clean design for all sessions.

### 6.2 Presenter Customization

**Logo:** Displayed in participant page header

**Brand guidelines:** AI uses them to style the participant page (colors, fonts)

- Not displayed to participants directly
- Applied as visual styling

**Rationale:** Presenters want their session to feel on-brand without designing it themselves. AI interprets guidelines and applies them.

### 6.3 Mobile-First

- Fully optimized for mobile (375px primary breakpoint)
- Works equally well on desktop
- Touch targets minimum 48px
- No horizontal scroll

---

## 7. Technical Specifications

### 7.1 Authentication

**Presenter:** Magic link via email
- Link expires after 1 month
- Single homepage flow for new and returning presenters

**Participant:** Email entry only
- No verification
- Email used for duplicate detection and edit access

### 7.2 File Uploads

**Supported formats:**
- PDF
- PowerPoint (PPT, PPTX)
- Word (DOC, DOCX)
- Images for logo (PNG, JPG, SVG)

**Size limit:** 10-25MB

**Error handling:**
- Attempt to parse/extract text
- On partial failure: Show extracted content, offer manual fallback
- On complete failure: Error message with option to try different file or paste manually

### 7.3 AI Usage

**Powered by:** Presenter's API key initially (Ari covers costs)

**AI generates:**
- Session title (from summary)
- Welcome message (from summary)
- Themes (from summary, count based on session length)
- URL slug (from title)
- Condensed summary preview (from full summary)
- Spotlights (from aggregated responses)
- Write-in summary (from free-form responses)
- Final outline (from all feedback)

**Error handling:**
- Auto-retry on failure
- User-friendly error with technical details on expand
- Manual fallback option

### 7.4 Email Service

**Provider:** Resend

**Emails sent:**
- Magic link to presenters
- New response notification to presenters

**Sender:** Resend default domain

### 7.5 Data Retention

**Policy:** Indefinite

Presenters delete their own data when ready.

**Rationale:** Start simple. Add auto-cleanup later if storage becomes an issue.

### 7.6 Error Handling

All errors show:
- User-friendly message with actionable next step
- "Show details" option for technical information

---

## 8. Dashboard & Session Management

### 8.1 Dashboard Layout

**Active Sessions Section:**
- List of all active sessions
- Each shows: title, state, response count
- Click to open session

**Create New Button:**
- Opens: Start from scratch OR Use archived as template

**Archived Button:**
- Opens separate view of archived sessions

### 8.2 Session Actions by State

**Draft:**
- Resume and edit
- Clear and restart (wipes data, keeps structure)
- Delete

**Active:**
- View session (details + responses)
- Edit session (summary, themes)
- Mark as Completed
- Delete

**Completed:**
- View results
- Move to Archived
- Delete

**Archived:**
- View (read-only)
- Use as template (creates new Draft)
- Delete

### 8.3 Multiple Drafts

If multiple sessions in Draft state: Show dropdown to select which to edit.

**Rationale:** Edge case, but should be handled gracefully.

### 8.4 Multiple Active Sessions

**Deferred to later stage.**

**Rationale:** Adds complexity. Start with one active session at a time, expand if needed.

---

## 9. Future Considerations (Not in v1)

These were explicitly deferred:

1. **Admin dashboard** - Usage monitoring, session overview
2. **Custom email domain** - Professional sender address
3. **Multiple active sessions** - If needed based on usage
4. **Participant visibility** - See others' suggestions
5. **In-app messaging** - Send/resend links through app
6. **Analytics** - Response rates, timing data
7. **Auto-cleanup** - Delete old archived sessions
8. **Google Docs link fetching** - OAuth integration

---

## 10. Success Criteria

The app succeeds when:

1. A presenter can create a session in under 5 minutes
2. Participants can respond in under 2 minutes
3. The generated outline meaningfully reflects participant priorities
4. Spotlights surface interesting ideas that would otherwise be lost in aggregation
5. The entire flow works smoothly on mobile

---

## 11. Open Questions

None remaining - all decisions documented above.

---

## Appendix A: User Flows Summary

### Presenter Journey

```
Homepage → Enter email → Magic link →
[First time: Profile setup] → Dashboard →
Create presentation → Enter title + length →
Add outline → Review/edit extracted topics →
Confirm & Publish (creates active presentation) →
See confirmation with participant link →
Share link externally →
[Optional: Edit working version → Publish updates] →
Check results → Close participant voting →
Export outline → Archive
```

### Participant Journey

```
Open link → Enter email →
[If returning: See previous response] →
Read summary → Mark theme interests →
Add free-form thoughts (optional) →
Add name/email (optional) → Submit →
See thank you message
```

---

## Appendix B: Data Model Overview

**Presenter**
- id
- email
- name
- organization
- logo_url (optional)
- brand_guidelines_url (optional)
- created_at

**Session**
- id
- presenter_id
- state (draft, active, completed, archived)
- length_minutes
- title
- welcome_message
- summary_full
- summary_condensed
- slug
- created_at
- updated_at

**Theme**
- id
- session_id
- text
- order

**Response**
- id
- session_id
- participant_email
- name (optional)
- followup_email (optional)
- free_form_text (optional)
- participant_token
- created_at
- updated_at

**ThemeSelection**
- id
- response_id
- theme_id
- selection (more, less)

---

*End of Specification*
