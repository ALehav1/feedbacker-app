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

### For Presentation-Prep-Feedbacker

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
