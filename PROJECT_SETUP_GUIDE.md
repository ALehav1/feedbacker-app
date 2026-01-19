# Project Setup Guide

## What Was Created

This package contains the documentation foundation for Feedbacker App.

### File Structure

```
feedbacker-app/
├── .gitignore              # Security - prevents committing secrets
├── .env.example            # Environment variable template
├── README.md               # Project overview for developers
├── SCRAP.md                # Code graveyard for safe deletion
│
├── docs/
│   ├── ARCHITECTURE.md     # Technical architecture
│   ├── BASELINE_LOCK.md    # Frozen baseline documentation
│   ├── SECURITY.md         # Security documentation
│   ├── SMOKE_TEST_RESULTS.md # Test results
│   └── SPEC.md             # Product requirements
│
├── supabase/
│   ├── README.md           # Supabase setup instructions
│   ├── schema.sql          # Database schema
│   └── rls-policies.sql    # Row Level Security policies
│
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

### 2. Initialize the Project

```bash
# Initialize npm
npm init -y

# Initialize Vite + React + TypeScript
npm create vite@latest . -- --template react-ts

# Install core dependencies
npm install @supabase/supabase-js openai resend
npm install react-router-dom
npm install -D tailwindcss postcss autoprefixer
npm install -D @types/react @types/react-dom @types/node

# Initialize Tailwind
npx tailwindcss init -p
```

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

### 5. Create the Folder Structure

```bash
mkdir -p src/features/auth
mkdir -p src/features/presenter/SessionCreate
mkdir -p src/features/participant
mkdir -p src/components/ui
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p src/types
mkdir -p src/utils
mkdir -p src/styles
```

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
