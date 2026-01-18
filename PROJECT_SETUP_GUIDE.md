# Project Setup Guide

## What Was Created

This package contains the documentation foundation for Feedbacker App, designed to keep Cascade on track.

### File Structure

```
feedbacker-app/
├── .windsurfrules          # Cascade agent rules (MOST IMPORTANT)
├── .gitignore              # Security - prevents committing secrets
├── .env.example            # Environment variable template
├── README.md               # Project overview for developers
├── agents.md               # Project-specific agent instructions
├── SCRAP.md                # Code graveyard for safe deletion
├── PLAN.md                 # Day-by-day implementation plan
│
└── docs/
    ├── contract.md         # Universal rules (highest priority)
    ├── ARCHITECTURE.md     # Technical architecture
    └── SPEC.md             # Product requirements
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
# - OpenAI API key
# - Resend API key
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

## When Starting a Cascade Chat

### First Message Template

```
PROJECT: Feedbacker App
GOAL: [Specific feature/task]

Before proceeding:
1. Read .windsurfrules
2. Read docs/contract.md
3. Read agents.md

Acknowledge you've read these, then provide a plan for:
[What you want to build]

No code yet - just the plan.
```

### For Feature Implementation

```
PROJECT: Feedbacker App
FEATURE: [Feature name]

Context from docs:
- See docs/ARCHITECTURE.md for data flow
- See docs/SPEC.md for requirements

Task:
[Specific implementation task]

Requirements from .windsurfrules:
- Mobile-first (test 375px first)
- TypeScript (no 'any' types)
- Loading states for all async
- Error states for all async
```

---

## Key Documents Explained

### .windsurfrules
**Purpose:** Controls Cascade behavior. This is what keeps the agent on track.

**Key sections:**
- Gated Execution Model (phases with gates)
- Definition of Done (checklist)
- Architectural Invariants (things that can't change)
- Hooks Contract (what each hook must do)

### agents.md
**Purpose:** Project-specific instructions, user flows, and common mistakes.

**When to use:** Reference when Cascade needs to understand the "why" behind decisions.

### docs/contract.md
**Purpose:** Universal rules that apply to all projects. Highest priority.

**Key content:**
- Decision-making protocol
- Code quality standards
- Testing requirements
- Documentation requirements

### docs/ARCHITECTURE.md
**Purpose:** Technical reference for data flow, components, and APIs.

**Key content:**
- Project structure
- Database schema
- Component contracts
- Hook interfaces

### docs/SPEC.md
**Purpose:** Product requirements - what the app should do.

**Key content:**
- Feature specifications
- User flows
- Business rules
- Rationale for decisions

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

## Symlink Strategy (For Multi-Project Consistency)

If you're building multiple projects, keep one master contract.md to ensure consistent rules everywhere:

### First Time Setup (Once)

```bash
# Create master contract location
mkdir -p ~/repos/docs

# Copy the contract to master location
cp docs/contract.md ~/repos/docs/contract.md
```

### In Each Project

```bash
# Remove the local copy
rm docs/contract.md

# Create symlink to master
ln -s ~/repos/docs/contract.md docs/contract.md

# Verify it works
cat docs/contract.md | head -10  # Should show master content
ls -la docs/contract.md          # Should show -> ~/repos/docs/contract.md
```

### Benefits

- **Single source of truth:** Update contract.md once, all projects see changes
- **Consistency:** Same rules across UpdateGenie, PresentationStudio, Language App, etc.
- **Learning:** New patterns learned in one project benefit all projects

### What Stays Local

- `agents.md` — Different for each project (project-specific context)
- `.windsurfrules` — Different for each project (project-specific rules)
- `docs/ARCHITECTURE.md` — Different for each project
- `docs/SPEC.md` — Different for each project

---

## Common Cascade Problems & Solutions

### Problem: Agent ignores mobile-first
**Solution:** Add to every prompt: "Test at 375px FIRST before any other breakpoint."

### Problem: Agent adds features not requested
**Solution:** Reference contract.md: "No features unless explicitly requested."

### Problem: Agent skips loading states
**Solution:** Add to prompt: "Must include loading AND error states for all async operations."

### Problem: Agent uses `any` types
**Solution:** Add to prompt: "No `any` types. Define interfaces for all data shapes."

### Problem: Agent claims "done" prematurely
**Solution:** Say: "Please go through the Definition of Done checklist from .windsurfrules and confirm each item."

---

## When Cascade Goes Off Track

### Reset Prompt

```
STOP.

Please re-read:
1. .windsurfrules (especially Definition of Done)
2. docs/contract.md
3. agents.md

Then tell me:
1. What phase are we in?
2. What gate have we passed?
3. What's blocking the next gate?

Do not proceed until we align on these.
```

---

## Next Steps

1. **Create the actual project** with Vite/React/TypeScript
2. **Set up Supabase** with the schema from ARCHITECTURE.md
3. **Start with auth flow** (magic link → dashboard)
4. **Build presenter features** (dashboard → create → view)
5. **Build participant features** (access → feedback → submit)
6. **Add AI generation** (themes → outline)

Each feature should be a separate Cascade chat to avoid context confusion.

---

**Remember:** The goal of this documentation is to help Cascade stay focused. When in doubt, reference the docs. When stuck, ask for clarification.
