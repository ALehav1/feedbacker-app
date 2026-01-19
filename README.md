# Feedbacker App

**AI-powered presentation feedback tool that helps presenters tailor their talks to what audiences actually want to hear.**

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
| **Session States** | Only 4 states: `draft` → `active` → `completed` → `archived`. No skipping. |
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

# Run database migrations (see docs/ARCHITECTURE.md for schema)

# Start development server
npm run dev
```

### Access

- **Local dev:** http://localhost:5173
- **Production:** [deployment URL]

### End-to-End Demo

1. **Login:** Enter your email at `/` → Check for magic link → Click to authenticate
2. **Profile:** First-time users complete profile at `/dashboard/profile`
3. **Create Session:** Click "New Session" → Enter title, length, summary → Submit
4. **Open Session:** View session detail → Click "Open Session" to make it active
5. **Share Link:** Copy shareable link → Send to participants
6. **Collect Feedback:** Participants visit `/s/{slug}` → Select themes → Submit
7. **View Results:** Open Results tab → See aggregated theme interest + individual responses
8. **Close Session:** Click "Close Session" when done collecting feedback

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

## 📊 Session States

```
DRAFT ──────▶ ACTIVE ──────▶ COMPLETED ──────▶ ARCHIVED
  │              │               │                │
  │              │               │                │
  ▼              ▼               ▼                ▼
Setup         Collecting      Reviewing        Closed
Edit all      Can still edit  View results     Read-only
              Accepting       No new feedback  Use as template
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

## 🗺️ Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/` | LoginPage | Public |
| `/auth/callback` | AuthCallback | Public |
| `/dashboard` | Dashboard | Protected |
| `/dashboard/profile` | ProfileSetup | Protected |
| `/dashboard/sessions/new` | SessionCreate | Protected |
| `/dashboard/sessions/:sessionId` | SessionDetail | Protected |
| `/s/:slug` | FeedbackForm | Public |

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| `.windsurfrules` | Cascade agent rules (read first) |
| `agents.md` | Project-specific agent instructions |
| `docs/contract.md` | Universal + project rules |
| `docs/ARCHITECTURE.md` | Technical architecture |
| `docs/SPEC.md` | Product requirements |
| `docs/TESTING.md` | Manual test checklist + SQL seeds |
| `docs/SECURITY.md` | Security model + RLS policies |

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
2. Click link → Dashboard
3. Create session → Enter title, summary, themes
4. Share link with participants
5. View aggregated feedback results

### Participant

1. Open shared link
2. Read summary, select theme interests (👍/👎)
3. Optionally enter name, email, and free-form thoughts
4. Submit → Done

---

## 🐛 Known Limitations

- No real-time updates (manual refresh required)
- No admin dashboard for usage monitoring
- AI features (theme generation, outline export) not yet implemented

---

## 🔮 Future Enhancements

- [ ] AI-generated themes from summary (OpenAI integration)
- [ ] AI-generated prioritized outline export
- [ ] Custom email domain (Resend integration)
- [ ] Real-time updates
- [ ] Participant visibility into others' responses
- [ ] Usage analytics dashboard

---

## 📄 License

MIT

---

## 📚 For Cascade Agents

**MUST READ BEFORE WORKING:**

1. `.windsurfrules` — Agent rules
2. `agents.md` — Project instructions
3. `docs/contract.md` — Universal contract

**When in doubt, ASK — don't guess.**
