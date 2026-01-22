# Feedbacker App

**AI-powered presentation feedback tool that helps presenters tailor their talks to what audiences actually want to hear.**

**📘 Quick Start:** Product requirements in `docs/SPEC.md` • Technical architecture in `docs/ARCHITECTURE.md`

---

## 🎯 What It Does

Instead of guessing what your audience wants:

1. **Share** what you're working on
2. **Collect** structured feedback on what interests them
3. **View** aggregated results to prioritize your presentation

---

## 🔒 Architectural Invariants (Do Not Violate)

These rules prevent regressions. Follow them strictly:

| Invariant | Rule |
|-----------|------|
| **Presentation States** | Only 4 states: `draft` → `active` → `completed` → `archived`. No skipping. State reflects **participant voting** lifecycle, not presentation content. |
| **Theme Selection** | Per participant, per theme: `more`, `less`, or neutral (no row). Never both. |
| **Presenter Auth** | Magic link via email only. No passwords. |
| **Participant Access** | Public link, optional email. No verification. No account. |
| **Data Source** | Supabase is single source of truth. localStorage for recovery only. |

**⚠️ Changes to these invariants require explicit justification.**

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Setup

```bash
# Clone repository
git clone https://github.com/ALehav1/feedbacker-app.git
cd feedbacker-app

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Fill in your keys in .env:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_PUBLIC_BASE_URL (for participant links)

# Run database migrations
# 1. Execute supabase/schema.sql in Supabase SQL Editor
# 2. Execute supabase/rls-policies.sql
# 3. Execute any migrations in supabase/migrations/ in order

# Start development server
npm run dev
```

### Access

- **Local dev:** http://localhost:5173
- **Production:** https://feedbacker-app-aqim.vercel.app

### End-to-End Demo

1. **Login:** Enter your email at `/` → Check for magic link → Click to authenticate
2. **Profile:** First-time users complete profile at `/dashboard/profile`
3. **Create Presentation:** Click "Create New Presentation" → Enter title, presenter, length, welcome message, overview summary, and outline
4. **Review Topics:** Topics are automatically generated from your outline → Review, edit, reorder, or add new topics
5. **Confirm & Create:** Review all details → Click "Confirm & create presentation"
6. **Activate Presentation:** From presentation detail, click "Confirm & start collecting feedback"
7. **Share Link:** Copy participant link → Send to audience
8. **Collect Feedback:** Participants visit `/s/{slug}` → Select topics (more/less) → Submit
9. **Edit While Active:** Edit presentation → Make changes → Save (working version) → Changes remain unpublished until you're ready
10. **View Results:** Click "Audience feedback" tab → See topic prioritization + individual responses
11. **Close Participant Voting:** Click "Close participant voting" button (Dashboard or detail page) when done collecting

### Outline Format Best Practices

For best topic extraction results:

- **Use top-level bullets** for each main topic
- **Keep topics short** (3–10 words)
- **Add sub-bullets** for supporting detail
- **Optional: Use "Topic:" prefix** for improved accuracy

**Example:**
```
- Topic: Problem framing
  - Supporting: quick story
  - Supporting: why it matters now
- Topic: Current constraints
- Topic: Proposed approach
```

**Extraction behavior:**
- Prioritizes minimal-indent bullets
- Strips "Topic:" prefix for display
- Filters topics >120 characters
- Caps at 12 topics
- If <4 top-level topics found, includes second-level bullets as fallback

---

## 📱 Mobile-First Development

**Test at these breakpoints IN ORDER:**

1. **375px** — Phone baseline (MUST work first)
2. **768px** — Tablet
3. **1024px** — Desktop

### Requirements

- Touch targets ≥ 48×48px
- No horizontal scroll
- Readable text without zoom

---

## 🗂️ Project Structure

```
src/
├── features/           # Feature-based modules
│   ├── auth/          # Magic link handling
│   ├── presenter/     # Presenter views (dashboard, create, results)
│   └── participant/   # Participant views (access, feedback, thanks)
├── components/        # Shared UI components
├── hooks/             # Data hooks (sessions, responses, AI)
├── lib/               # External service clients (Supabase, OpenAI, Resend)
├── types/             # TypeScript definitions
└── utils/             # Utility functions
```

---

## 📊 Presentation States & Editing Model

### Working vs Live Versions

Feedbacker uses a **Working vs Live** model to let presenters edit while collecting feedback:

- **Working version:** What the presenter edits (visible only to presenter)
- **Live version:** What participants see (published snapshot)
- **Publish updates:** Explicit action that makes Working become Live
- **Discard changes:** Reverts Working back to Live

**Key behaviors:**
- Active presentations remain editable without disrupting participants
- Participants always see the Live version (last published state)
- Unpublished changes are clearly indicated with amber "Updates pending" badges
- Navigate-away guardrail prevents accidental loss of unpublished work

**Canonical copy:** All UX strings defined in `src/lib/copy.ts`

### Presentation State Flow

```
DRAFT ──────▶ ACTIVE ──────▶ COMPLETED ──────▶ ARCHIVED
  │              │               │                │
  │              │               │                │
  ▼              ▼               ▼                ▼
Setup         Collecting      Reviewing        Closed
Edit all      Edit + Publish  View results     Read-only
              Live vs Working No new feedback  Use as template
```

---

## 🧪 Development

### Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # TypeScript type checking
npm run preview      # Preview production build
```

### Before Any Commit

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Tested at 375px
- [ ] Zero console errors

---

## 🚀 Deployment

### Production

**Live URL:** https://feedbacker-app-aqim.vercel.app

**Hosting:** Vercel (auto-deploys from `main` branch)

### Deploy to Vercel

1. **Fork/clone repository** to your GitHub account

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Set environment variables** in Vercel dashboard:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_PUBLIC_BASE_URL=https://your-app.vercel.app
   ```

4. **Configure Supabase redirect URLs:**
   - Add `https://your-app.vercel.app/auth/callback` to allowed URLs
   - Supabase Dashboard → Authentication → URL Configuration

5. **Deploy:** Push to `main` branch or click "Deploy" in Vercel

### Domain Setup

The `vercel.json` file includes redirect configuration from `feedbacker-app.vercel.app` to the primary domain.

---

## 🗺️ Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/` | LoginPage | Public |
| `/auth/callback` | AuthCallback | Public |
| `/dashboard` | Dashboard | Protected |
| `/dashboard/profile` | ProfileSetup | Protected |
| `/dashboard/sessions/new` | SessionCreateWizard | Protected |
| `/dashboard/sessions/:sessionId` | SessionDetail | Protected |
| `/dashboard/sessions/:sessionId/edit` | SessionEdit | Protected |
| `/s/:slug` | FeedbackForm | Public |

**Router:** Uses React Router v6 data router (`createBrowserRouter` + `RouterProvider`).

---

## 🏗️ Topic Encoding

Topics and their optional sub-bullets are encoded as a single string in the database to avoid additional migrations:

**Format:** `"Title\n- Sub1\n- Sub2"`

**Example:**
```
"Problem framing\n- Quick story\n- Why it matters now"
```

**Implementation:**
- Encoding/decoding logic: `src/lib/topicBlocks.ts`
- Used in: SessionCreateWizard, SessionEdit, FeedbackForm, ThemeSelector
- Database column: `themes.text` (TEXT)
- Published snapshot: `sessions.published_topics` (JSONB array with encoded text)

**Benefits:**
- No schema changes required for subtopic support
- Simple text storage with clear parsing rules
- Easy to add/edit in UI with multiline textareas

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| `.windsurfrules` | Cascade agent rules (read first) |
| `docs/contract.md` | Universal + project rules |
| `docs/SPEC.md` | Product requirements |
| `docs/ARCHITECTURE.md` | Technical architecture & schema |
| `docs/BASELINE_LOCK.md` | Frozen file change log |
| `docs/TEST_CASES.md` | Manual test checklist |
| `docs/REGRESSION_CHECKLIST.md` | Smoke test for releases |
| `docs/TESTING.md` | Testing strategy |
| `docs/SECURITY.md` | Security model & RLS policies |
| `docs/PROJECT_SETUP_GUIDE.md` | Detailed setup instructions |
| `docs/SUPABASE_SETUP_GUIDE.md` | Supabase configuration |
| `docs/SCRAP.md` | Development notes & scratchpad |

**Product and Architecture Canon:** `docs/SPEC.md` and `docs/ARCHITECTURE.md` are the single sources of truth for product requirements and technical architecture, respectively.

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (magic links) |
| Hosting | Vercel |

**Future Integrations (not yet implemented):**
- AI: OpenAI GPT-4o (theme generation, outline export)
- Email: Resend (custom email domain)

---

## 👥 User Flows

### Presenter

1. Enter email → Receive magic link
2. Click link → Dashboard with two sections:
   - **Active Sessions — Participant Voting Open:** Close voting directly from tile
   - **Closed Sessions — Participant Voting Closed:** Delete presentations with confirmation
3. Create presentation → Enter title, presenter, summary, themes
4. Share link with participants
5. Close participant voting when ready (from Dashboard or detail page)
6. View aggregated feedback results
7. Delete closed presentations when no longer needed

### Participant

1. Open shared link
2. If voting open: Read summary, select theme interests (👍/👎)
3. If voting closed: Read summary (voting interactions disabled)
4. Optionally enter name, email, and free-form thoughts (only when voting open)
5. Submit → Done

---

## 🐛 Known Limitations

- No real-time updates (manual refresh required)
- No admin dashboard for usage monitoring
- AI-powered outline export planned for future release

**Navigation Protection:** Both SessionEdit and SessionCreateWizard have full navigation protection (browser back, refresh, in-app navigation) with draft recovery.

---

## 🔮 Future Enhancements

- [ ] AI-generated topics from outline (OpenAI integration)
- [ ] AI-generated prioritized outline export
- [ ] Custom email domain (Resend integration)
- [ ] Real-time updates for live participant counts
- [ ] Participant visibility into aggregated results
- [ ] Usage analytics dashboard
- [ ] Revision history for published versions

---

## 📄 License

MIT

---

## 📚 For Cascade Agents

**MUST READ BEFORE WORKING:**

1. `.windsurfrules` — Agent rules (project-specific)
2. `docs/contract.md` — Universal contract + project rules
3. `docs/BASELINE_LOCK.md` — Frozen baseline & exceptions

**When in doubt, ASK — don't guess.**
