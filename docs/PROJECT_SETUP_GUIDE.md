# Project Setup Guide

## What Was Created

This package contains the documentation foundation for Feedbacker App.

### File Structure

```
feedbacker-app/
├── .gitignore              # Security - prevents committing secrets
├── .env.example            # Environment variable template
├── README.md               # Project overview for developers
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite build configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── vercel.json             # Vercel deployment config
│
├── docs/
│   ├── ARCHITECTURE.md     # Technical architecture
│   ├── SPEC.md             # Product requirements
│   ├── SECURITY.md         # Security documentation
│   ├── TESTING.md          # Testing strategy
│   ├── TEST_CASES.md       # Manual test checklist
│   ├── BASELINE_LOCK.md    # Frozen baseline documentation
│   ├── PROJECT_SETUP_GUIDE.md  # This file
│   ├── SUPABASE_SETUP_GUIDE.md # Supabase configuration
│   └── REGRESSION_CHECKLIST.md # Smoke test for releases
│
├── src/
│   ├── features/           # Feature-based modules
│   │   ├── auth/           # Authentication (LoginPage, AuthCallback, etc.)
│   │   ├── presenter/      # Presenter views (Dashboard, ProfileSetup)
│   │   ├── sessions/       # Session management (Wizard, Detail, Edit, DeckBuilder)
│   │   └── participant/    # Participant views (FeedbackForm)
│   ├── components/         # Shared components + shadcn/ui
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # External service clients & utilities
│   ├── types/              # TypeScript definitions
│   └── config/             # App configuration
│
├── supabase/
│   ├── schema.sql          # Database schema
│   ├── rls-policies.sql    # Row Level Security policies
│   └── MIGRATION.sql       # Migration scripts
│
├── e2e/                    # Playwright E2E tests
└── archive/                # Archived/outdated files
```

---

## How to Use This

### 1. Create Your Project Repository

```bash
# Clone repository
git clone https://github.com/ALehav1/feedbacker-app.git
cd feedbacker-app

# Copy all these files into it
# (or use this as your starting point)
```

### 2. Initialize the Project (Fresh Setup)

If setting up from scratch:

```bash
# Initialize Vite + React + TypeScript
npm create vite@latest . -- --template react-ts

# Install core dependencies
npm install @supabase/supabase-js react-router-dom react-hook-form @hookform/resolvers zod
npm install pptxgenjs  # For PowerPoint export

# Install Radix UI primitives (used by shadcn/ui)
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs
npm install @radix-ui/react-toast @radix-ui/react-label @radix-ui/react-slot
npm install @radix-ui/react-alert-dialog

# Install styling utilities
npm install tailwind-merge clsx class-variance-authority tailwindcss-animate
npm install lucide-react  # Icons

# Install dev dependencies
npm install -D tailwindcss postcss autoprefixer
npm install -D @types/react @types/react-dom @types/node
npm install -D @playwright/test  # E2E testing

# Initialize Tailwind
npx tailwindcss init -p
```

**Note:** For an existing clone, just run `npm install` - all dependencies are in package.json.

### 3. Configure Tailwind

Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Update `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4. Install and Configure shadcn/ui

**Why shadcn?** Components are copied INTO your codebase, so Cascade can read and edit them. Built on Radix UI (accessible by default). No runtime dependencies to break.

```bash
# Initialize shadcn (accept defaults or customize)
npx shadcn@latest init

# Install essential components (all at once)
npx shadcn@latest add button card dialog form input label toast skeleton tabs dropdown-menu alert textarea
```

**shadcn components install to:** `src/components/ui/`

**After install:** You can edit these files directly. They're yours now.

### 5. Set Up Environment

```bash
# Copy the template
cp .env.example .env

# Edit .env with your actual keys:
# - Supabase URL and anon key
# Note: OpenAI and Resend integrations are planned for future versions
```

### 4. Set Up Database

Use the schema from `docs/ARCHITECTURE.md` to create your Supabase tables:
- `presenters`
- `sessions`
- `themes`
- `responses`
- `theme_selections`

### 6. Create the Folder Structure

```bash
mkdir -p src/features/auth
mkdir -p src/features/presenter
mkdir -p src/features/sessions
mkdir -p src/features/participant
mkdir -p src/components/ui
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p src/types
mkdir -p src/config
mkdir -p supabase
mkdir -p e2e
```

**Note:** For an existing clone, folders are already created.

---

## Key Documents

### docs/ARCHITECTURE.md
**Purpose:** Technical reference for data flow, components, and APIs.

**Key content:**
- Project structure
- Database schema
- Component contracts
- Hook interfaces

### docs/SPEC.md
**Purpose:** Product requirements - what the app should do.

### docs/BASELINE_LOCK.md
**Purpose:** Documents frozen baseline files and change exceptions.

### docs/SECURITY.md
**Purpose:** Security model, known limitations, and production roadmap.

---

## Safety Nets

### 1. .gitignore
Prevents committing:
- `.env` files (API keys!)
- `node_modules`
- Build outputs

**Check before every commit:**
```bash
git status
# If .env appears → STOP and remove it
```

### 2. SCRAP.md
Before deleting significant code:
1. Copy to SCRAP.md
2. Note why it didn't work
3. Then delete from source

---

## Development Troubleshooting

### Supabase Navigator Lock AbortError

**Symptom:** Console shows `AbortError: signal is aborted without reason` with stack traces pointing to `navigatorLock` in Supabase.

**Cause:** Supabase uses the Navigator Lock API for cross-tab session synchronization. During Vite HMR, this causes lock conflicts.

**Solution Applied:**
1. Navigator Lock API disabled in `src/lib/supabase.ts` via `Object.defineProperty`
2. Singleton pattern with version control to force new client on config changes
3. React StrictMode removed from `src/main.tsx`
4. Retry mechanism added to `getSession()` in AuthContext

**If it recurs:**
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Clear browser localStorage for localhost:5173
# (DevTools → Application → Local Storage → Clear)

# Hard refresh browser
# Mac: Cmd+Shift+R | Windows/Linux: Ctrl+Shift+R

# Restart dev server
npm run dev
```

**See:** `docs/SMOKE_TEST_RESULTS.md` for technical troubleshooting details.

---

## Development Workflow

1. Run `npm run dev` to start the development server
2. Test at mobile viewport (375px) first
3. Run `npm run build` and `npm run lint` before committing
4. Update documentation when making significant changes
5. Follow the BASELINE_LOCK protocol for frozen files
