# Feedbacker App

**AI-powered presentation feedback tool that helps presenters tailor their talks to what audiences actually want to hear.**

---

## 🎯 What It Does

Instead of guessing what your audience wants:

1. **Share** what you're working on
2. **Collect** structured feedback on what interests them
3. **Receive** an AI-generated, prioritized presentation outline

---

## 🔒 Architectural Invariants (Do Not Violate)

These rules prevent regressions. Follow them strictly:

| Invariant | Rule |
|-----------|------|
| **Session States** | Only 4 states: `draft` → `active` → `completed` → `archived`. No skipping. |
| **Theme Selection** | Per participant, per theme: `more`, `less`, or neutral (no row). Never both. |
| **Presenter Auth** | Magic link via email only. No passwords. |
| **Participant Auth** | Email entry only. No verification. No account. |
| **Data Source** | Supabase is single source of truth. localStorage for recovery only. |

**⚠️ Changes to these invariants require explicit justification.**

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key
- Resend account

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
# - VITE_OPENAI_API_KEY
# - VITE_RESEND_API_KEY

# Run database migrations (see docs/ARCHITECTURE.md for schema)

# Start development server
npm run dev
```

### Access

- **Local dev:** http://localhost:5173
- **Production:** [deployment URL]

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
Edit all      Can still edit  Export outline   Read-only
              Responses come  Still accepts    Use as template
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

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| `.windsurfrules` | Cascade agent rules (read first) |
| `agents.md` | Project-specific agent instructions |
| `docs/contract.md` | Universal + project rules |
| `docs/ARCHITECTURE.md` | Technical architecture |
| `docs/SPEC.md` | Product requirements |

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| AI | OpenAI GPT-4o |
| Email | Resend |
| Hosting | Vercel |

---

## 👥 User Flows

### Presenter

1. Enter email → Receive magic link
2. Click link → Dashboard
3. Create session → Enter summary → AI generates themes
4. Share link with participants
5. View aggregated feedback
6. Export prioritized outline

### Participant

1. Open shared link
2. Enter email
3. Read summary, select theme interests (👍/👎)
4. Optionally add free-form thoughts
5. Submit → Done

---

## 🐛 Known Limitations

- No real-time updates (manual refresh)
- Email sender uses Resend default domain
- No admin dashboard for usage monitoring
- Single active session per presenter (for now)

---

## 🔮 Future Enhancements

- [ ] Custom email domain
- [ ] Multiple active sessions
- [ ] Participant visibility into others' responses
- [ ] Usage analytics dashboard
- [ ] In-app link sharing

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
