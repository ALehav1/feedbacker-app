# Universal Contract — Rules for All Projects

**This document has highest priority.** It overrides all other instructions.

---

## Decision-Making Protocol

### ✅ DO Ask When Ambiguous
- Present 2-3 options with trade-offs
- Wait for explicit choice before proceeding
- Never assume the "obvious" answer

### ❌ DON'T Add Features Not Requested
- If you think something would be useful, ASK first
- No "while I'm here" additions
- No optimization without explicit request

### ✅ DO Explain Before Changing Architecture
- State what you're changing and why
- Explain trade-offs
- Wait for approval on significant changes

### ❌ DON'T Silently Refactor
- Never restructure without explanation
- No opportunistic cleanup
- One concern per change

---

## Completion Criteria

### Before Saying "Done"

Check ALL of the following:

- [ ] Tested at 375px viewport
- [ ] Tested at 768px viewport
- [ ] Tested at 1024px viewport
- [ ] Zero console errors
- [ ] Zero TypeScript errors
- [ ] Loading states for all async operations
- [ ] Error states for all async operations
- [ ] User-friendly error messages (not technical)
- [ ] No `any` types in TypeScript
- [ ] Touch targets minimum 48×48px
- [ ] No horizontal scroll on mobile
- [ ] All required files updated (docs, types, etc.)

**If ANY item is unchecked → NOT DONE.**

---

## Communication Style

### ✅ DO Explain Concepts
- Define technical terms immediately when used
- Use concrete examples from the current project
- Show WHY before HOW
- Be explicit about what changed and what didn't

### ❌ DON'T Use Abstract Analogies
- Show actual code/data transformations
- Use project-specific examples
- Avoid "it's like a..." explanations

### ✅ DO Be Honest About Uncertainty
- If unsure, say so
- Propose verification steps
- Don't pretend to know

### ❌ DON'T Claim False Confidence
- Never say "this will definitely work" without testing
- Never skip edge case consideration
- Never dismiss potential issues

---

## Scope Management

### The 6-Day ROI Rule

```
Time to Build ÷ Time Saved Per Day = Days to Break Even
```

**If break-even > 6 days, only build if:**
- Pain level is HIGH (explicitly stated)
- Volume is growing fast
- Explicitly requested anyway

### Scope Creep Prevention

**Before adding anything not explicitly requested:**
1. Stop
2. Ask: "This would also require X. Should I include it?"
3. Wait for answer
4. Only proceed if approved

---

## Error Handling Philosophy

### User-Facing Errors
- Clear, actionable message
- What went wrong (briefly)
- What they can do about it
- Never show stack traces or technical details

### Developer Errors (Console)
- Full technical details
- Stack trace
- Request/response data
- Enough to debug

### Recovery
- Always offer a retry option for recoverable errors
- Never leave user stuck
- Always provide a way out

---

## Code Quality Standards

### TypeScript

```typescript
// ❌ NEVER
const data: any = ...
const response = await fetch(url) // untyped
function process(input) { ... }  // implicit any

// ✅ ALWAYS
const data: SessionResponse = ...
const response: Response = await fetch(url)
function process(input: InputType): OutputType { ... }
```

### React Components

```typescript
// ❌ NEVER
export default function Component(props) { ... }  // untyped props
<button onClick={() => ...}>X</button>  // no accessible name

// ✅ ALWAYS
interface ComponentProps {
  session: Session;
  onSave: (data: SaveData) => void;
}

export function Component({ session, onSave }: ComponentProps) { ... }
<button onClick={...} aria-label="Close">X</button>
```

### Async Operations

```typescript
// ❌ NEVER
const data = await fetchData();
return <List data={data} />;  // No loading/error handling

// ✅ ALWAYS
const { data, loading, error } = useFetchData();

if (loading) return <LoadingSkeleton />;
if (error) return <ErrorMessage error={error} onRetry={refetch} />;
return <List data={data} />;
```

### Bootstrap Loading Pattern (CRITICAL)

**Problem:** App hangs on loading spinner when secondary data fetches are slow or fail.

**Rule:** Never block loading state on secondary data fetches. Set loading to false as soon as you have the primary data, then fetch secondary data in the background.

```typescript
// ❌ NEVER - Blocks loading on secondary fetch
const bootstrap = async () => {
  const session = await getSession();        // Primary
  const profile = await fetchProfile(id);    // Secondary - can hang!
  setIsLoading(false);                       // Too late if profile hangs
};

// ✅ ALWAYS - Set loading false after primary, fetch secondary in background
const bootstrap = async () => {
  const session = await getSession();        // Primary
  setUser(session.user);
  setIsLoading(false);                       // Unblock UI immediately

  // Secondary fetch in background (non-blocking)
  const profile = await fetchProfile(id);
  setProfile(profile);
};
```

**Why this matters:**
- Network issues can cause secondary fetches to hang indefinitely
- Users see infinite spinner with no recourse
- Primary data (auth session) is sufficient to render the app
- Secondary data (profile) can populate when ready

**Apply to:**
- Auth bootstrap (session → profile)
- Page loads (route data → supplementary data)
- Any multi-step data fetching sequence

---

## Hard-Won Patterns

Patterns discovered through debugging. Follow exactly.

### 1. Mobile Overflow Prevention (375px)

**Problem:** Long text causes horizontal scroll on mobile.

```typescript
// ❌ Text overflows container
<p className="text-sm">{longText}</p>

// ✅ Prevent overflow with these utilities
<p className="text-sm break-words">{longText}</p>

// For flex containers, add min-w-0 to allow shrinking
<div className="flex gap-2">
  <div className="flex-1 min-w-0">  {/* min-w-0 critical! */}
    <p className="break-words truncate">{longText}</p>
  </div>
</div>

// For stats/badges that wrap, use flex-wrap
<div className="flex flex-wrap gap-2">
  <span>Badge 1</span>
  <span>Badge 2</span>
</div>
```

**Checklist for 375px:**
- `break-words` on all user-generated text
- `min-w-0` on flex children that should shrink
- `flex-wrap` on badge/stat rows
- `overflow-hidden` on containers if needed
- Test with long strings (50+ chars, no spaces)

### 2. Navigation Protection (Unsaved Changes)

**Problem:** Users lose work when navigating away. Single approach doesn't cover all cases.

**Solution:** Multi-layer protection:

```typescript
// Layer 1: Browser close/refresh
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [isDirty]);

// Layer 2: Browser back button (especially iOS)
useEffect(() => {
  if (!isDirty) return;
  window.history.pushState({ guard: true }, '');

  const handler = () => {
    if (isDirty) {
      window.history.pushState({ guard: true }, '');
      setShowUnsavedDialog(true);
    }
  };
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}, [isDirty]);

// Layer 3: localStorage draft for crash recovery
useEffect(() => {
  if (isDirty) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  }
}, [formData, isDirty]);

// Layer 4: In-app navigation dialog
const handleNavigateAway = () => {
  if (isDirty) {
    setShowUnsavedDialog(true);
    setPendingNavigation(targetPath);
  } else {
    navigate(targetPath);
  }
};
```

**All four layers needed** for complete protection.

### 3. Controlled Tabs (Context-Based Defaults)

**Problem:** Tabs remembering last selection confuses users who expect consistent behavior.

```typescript
// ❌ Uncontrolled - remembers last tab
<Tabs defaultValue="details">

// ✅ Controlled - set based on context
const [activeTab, setActiveTab] = useState('details');

useEffect(() => {
  // Set default based on session state, not memory
  if (session.state === 'active' || session.state === 'completed') {
    setActiveTab('results');  // Show feedback first
  } else {
    setActiveTab('details');  // Show details for drafts
  }
}, [session.state]);

<Tabs value={activeTab} onValueChange={setActiveTab}>
```

**Rule:** Tab defaults should reflect user intent for current context, not persist across visits.

### 4. Data Router for Navigation Blocking

**Problem:** `useBlocker` hook only works with React Router data routers.

```typescript
// ❌ useBlocker crashes with BrowserRouter
import { BrowserRouter, Routes, Route } from 'react-router-dom';
<BrowserRouter><Routes>...</Routes></BrowserRouter>

// ✅ useBlocker works with createBrowserRouter
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/edit', element: <EditPage /> },  // Can use useBlocker
]);

<RouterProvider router={router} />
```

**Migration required** if adding useBlocker to existing BrowserRouter app.

### 5. Working vs Live Versioning (Active Content)

**Problem:** Editing active/published content disrupts users viewing it.

**Solution:** Dual-field pattern with explicit publish:

```sql
-- Working fields (presenter edits)
welcome_message TEXT,
summary_condensed TEXT,

-- Live fields (participants see)
published_welcome_message TEXT,
published_summary_condensed TEXT,
published_at TIMESTAMPTZ,
has_unpublished_changes BOOLEAN DEFAULT false
```

```typescript
// Edit updates working fields only
await supabase.from('sessions').update({
  welcome_message: newValue,
  has_unpublished_changes: true,
});

// Publish copies working → live
await supabase.from('sessions').update({
  published_welcome_message: workingValue,
  published_at: new Date().toISOString(),
  has_unpublished_changes: false,
});

// Participants always read published_* fields
const { data } = await supabase
  .from('sessions')
  .select('published_welcome_message, published_summary_condensed');
```

### 6. Structured Data in Single Text Field

**Problem:** Need to store hierarchical data (title + subtopics) but want simple schema.

**Solution:** Newline-delimited encoding:

```typescript
// Encode: title + subtopics → single string
function encodeTopicBlock(title: string, subtopics: string[]): string {
  if (subtopics.length === 0) return title;
  return title + '\n' + subtopics.map(s => `- ${s}`).join('\n');
}

// Decode: single string → title + subtopics
function decodeTopicBlock(text: string): { title: string; subtopics: string[] } {
  const lines = text.split('\n');
  const title = lines[0];
  const subtopics = lines.slice(1)
    .map(l => l.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
  return { title, subtopics };
}

// Storage: "Market Analysis\n- Competitor review\n- Pricing trends"
// Display: Title with bullet list underneath
```

**Benefits:** Simple TEXT column, no JSONB complexity, human-readable in DB.

---

## Supabase Patterns (CRITICAL)

These patterns were learned through painful debugging. Follow them exactly.

### 1. Supabase Client Singleton (Vite HMR)

**Problem:** Vite HMR creates multiple Supabase clients, causing auth state conflicts.

```typescript
// ❌ NEVER - Creates new client on every HMR reload
export const supabase = createClient(url, key);

// ✅ ALWAYS - Singleton pattern with version control
declare global {
  var __supabaseClient: SupabaseClient | undefined;
  var __supabaseVersion: number | undefined;
}

const CLIENT_VERSION = 1;  // Bump to force new client after config changes

if (globalThis.__supabaseVersion !== CLIENT_VERSION) {
  globalThis.__supabaseClient = undefined;
}

export const supabase: SupabaseClient =
  globalThis.__supabaseClient ??
  (globalThis.__supabaseClient = createClient(url, key, options));

globalThis.__supabaseVersion = CLIENT_VERSION;
```

### 2. Navigator Lock API Workaround

**Problem:** Supabase uses Navigator Lock API which causes `AbortError` during Vite HMR.

```typescript
// ✅ Disable Navigator Lock BEFORE creating Supabase client
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'locks', {
    get: () => undefined,
    configurable: true,
  });
}

// Then create client...
```

### 3. Auth State: Listener, Not One-Time Check

**Problem:** One-time `getUser()` misses auth state changes and causes stale state.

```typescript
// ❌ NEVER - Stale state, misses changes
const { data: { user } } = await supabase.auth.getUser();

// ✅ ALWAYS - Reactive listener
supabase.auth.onAuthStateChange((event, session) => {
  setUser(session?.user ?? null);
});

// Initial bootstrap still needs getSession, but listener handles updates
const { data: { session } } = await supabase.auth.getSession();
```

### 4. Presenter ID = Auth UID (RLS Critical)

**Problem:** If `presenters.id` doesn't match `auth.uid()`, ALL RLS policies fail silently.

```typescript
// ❌ NEVER - Generates random ID, breaks RLS
await supabase.from('presenters').insert({
  email: user.email,
  name: formData.name,
});

// ✅ ALWAYS - Explicitly set id to auth.uid()
await supabase.from('presenters').insert({
  id: user.id,  // MUST match auth.uid()
  email: user.email,
  name: formData.name,
});
```

**Why:** RLS policies use `auth.uid() = id` and `auth.uid() = presenter_id`. Mismatch = silent query failures.

### 5. Auth Bootstrap with Retry

**Problem:** `getSession()` can throw `AbortError` on initial load due to Navigator Lock timing.

```typescript
// ✅ Retry pattern for initial bootstrap
const getSessionWithRetry = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        await new Promise(r => setTimeout(r, 100 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  return null;
};
```

### 6. Magic Link Callback Race Condition

**Problem:** `AuthCallback` component can navigate before Supabase processes the magic link token in the URL.

```typescript
// ❌ NEVER - Navigates before session is established
useEffect(() => {
  if (!isLoading && !user) navigate('/');
}, [isLoading]);

// ✅ ALWAYS - Wait for session when URL has auth tokens
const hasAuthToken = window.location.hash.includes('access_token') ||
                     searchParams.has('code');

useEffect(() => {
  if (!isLoading && !hasAuthToken) {
    // No token in URL, safe to redirect
    navigate(user ? '/dashboard' : '/');
  }
  if (!isLoading && hasAuthToken && user) {
    // Token processed, user established
    navigate('/dashboard');
  }
}, [isLoading, user, hasAuthToken]);
```

---

## Documentation Requirements

### When to Update Docs

Update documentation when changing:
- Data models or schemas
- API contracts
- User flows
- Component contracts
- Hook interfaces
- Architectural decisions

### What to Update

| Change Type | Update These Files |
|-------------|-------------------|
| Data model | `ARCHITECTURE.md`, `types/` |
| User flow | `agents.md`, `SPEC.md` |
| Component contract | `agents.md`, component file |
| Hook interface | `ARCHITECTURE.md`, `agents.md` |
| New feature | `SPEC.md`, `README.md` |

### Documentation as Code

- Docs are versioned with code
- Out-of-date docs are bugs
- If code and docs conflict, fix both

---

## Git Commit Standards

### Commit Message Format

```
type(scope): brief description

- Specific change 1
- Specific change 2

[optional: why this approach was chosen]
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that doesn't fix bug or add feature |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `test` | Adding or fixing tests |
| `chore` | Maintenance tasks |

### Examples

```
feat(session): add state transition validation

- Add transitionState() method to useSessions hook
- Validate transitions match state machine
- Show error for invalid transitions

Chose explicit validation over DB constraints for better error messages.
```

```
fix(participant): prevent double-submit on slow network

- Disable submit button during submission
- Show loading spinner
- Re-enable on error for retry

Was causing duplicate responses in production.
```

---

## Testing Standards

### What Must Be Tested Manually

Before any PR:

1. **Happy path** - Main flow works
2. **Edge cases** - Empty states, long text, special characters
3. **Error states** - Network failure, invalid input
4. **Mobile** - 375px viewport first
5. **Tablet** - 768px viewport
6. **Desktop** - 1024px viewport

### Testing Checklist

```markdown
## Manual Testing Checklist

### Viewport Testing
- [ ] 375px: All content visible, no horizontal scroll
- [ ] 768px: Layout adjusts appropriately
- [ ] 1024px: Full desktop layout works

### Feature Testing
- [ ] Happy path works end-to-end
- [ ] Error states show appropriate messages
- [ ] Loading states appear during async operations
- [ ] Empty states are handled gracefully

### Accessibility
- [ ] Touch targets ≥ 48×48px
- [ ] Color contrast sufficient
- [ ] Focus states visible
- [ ] Screen reader text where needed
```

---

## Security Reminders

### Never Commit
- API keys
- Database credentials
- User data
- `.env` files

### Always Check
- `.gitignore` includes `.env`
- No hardcoded credentials in code
- No sensitive data in error messages
- No PII in console logs

---

## Project-Specific Addendum

### For Feedbacker App

**Additional completion criteria:**

- [ ] Session state machine transitions work correctly
- [ ] Theme selection (more/less/neutral) works correctly
- [ ] Presenter auth (magic link) works
- [ ] Participant access (email entry) works
- [ ] Results aggregation is accurate
- [ ] Export produces valid files
- [ ] All routes protected correctly

**Priority order for this project:**

1. Mobile experience (375px) — most participants will be on phones
2. Presenter experience — they create and manage sessions
3. Participant experience — they respond quickly
4. AI generation — quality of themes and outlines

---

**This contract is binding.** Agents must follow these rules without exception.
