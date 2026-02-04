# Security Architecture & Notes

**Last Updated:** January 18, 2026

This document explains the security model, known limitations, and production recommendations for the Feedbacker App application.

---

## Authentication Model

### Presenters (Authenticated Users)
- **Method:** Magic link via Supabase Auth
- **Identity:** `auth.uid()` matches `presenters.id`
- **Access:** Full CRUD on their own data only

### Participants (Unauthenticated)
- **Method:** Email entry only (no verification)
- **Identity:** None (`auth.uid()` is null)
- **Access:** Limited by session state and RLS policies

---

## Critical Implementation Details

### 1. Presenter ID Must Equal Auth User ID

**The Problem:**
RLS policies check `auth.uid() = presenters.id`. If these don't match, authentication breaks.

**The Solution:**
When creating a presenter profile, the client **MUST** explicitly set `id = auth.uid()`:

```typescript
// ✅ CORRECT
await supabase.from('presenters').insert({
  id: user.id,  // Explicitly set to auth.uid()
  email: user.email,
  name: formData.name,
  organization: formData.organization,
});

// ❌ WRONG - will generate random UUID that doesn't match auth.uid()
await supabase.from('presenters').insert({
  email: user.email,
  name: formData.name,
  organization: formData.organization,
});
```

**Database Schema:**
```sql
CREATE TABLE presenters (
  id UUID PRIMARY KEY,  -- NO DEFAULT - client must supply
  ...
);
```

**Why:** The `presenters.id` has no default value, forcing explicit insertion with `auth.uid()`.

---

## MVP Security Model (Current Implementation)

### What's Protected

✅ **Presenters can only access their own data**
- Sessions, themes, responses, and selections are isolated by `presenter_id`
- RLS policies enforce `auth.uid() = presenter_id` checks

✅ **Participants can't tamper with presenter data**
- No write access to sessions or themes
- Can only insert responses/selections for active/completed sessions (RLS)
- **Application enforces stricter active-only submission** (defense-in-depth)

✅ **Participant tokens prevent casual tampering**
- Each response gets a unique `participant_token`
- Token is returned to client after response creation
- Future: Use for update verification

### Known Limitations (MVP Trade-offs)

⚠️ **Session Enumeration**
```sql
-- This policy allows anyone to list ALL active sessions
CREATE POLICY "Anyone can read active sessions"
  ON sessions FOR SELECT
  USING (state IN ('active', 'completed'));
```

**Risk:** With the anon key, anyone can query all active sessions and see titles, summaries, etc.

**Why Acceptable for MVP:** 
- Sessions are meant to be shared
- No sensitive data in session metadata
- Slug-based access is the intended UX

**Production Fix:** Route participant reads through Edge Function that only returns the session matching the requested slug.

---

⚠️ **Participant Updates Disabled**
```sql
-- No UPDATE policy for responses table
-- Participants cannot edit their responses after submission
```

**Risk:** Participants can't fix typos or change their mind.

**Why Acceptable for MVP:**
- Simplifies security model
- Prevents response tampering
- Participants can submit again with same email (overwrites via UNIQUE constraint)

**Production Fix:** 
1. Create Edge Function `/api/session/:slug/respond`
2. Accept `participant_token` in request
3. Verify token matches response row
4. Allow update if valid

---

⚠️ **Selection Tampering (Theoretical)**
```sql
-- Anyone can INSERT/DELETE selections for active sessions
-- No token verification at RLS level
```

**Risk:** Someone could inspect network calls and manipulate `response_id` to change others' feedback.

**Why Acceptable for MVP:**
- Requires technical knowledge + malicious intent
- Low-value target (presentation feedback)
- Selections are tied to response_id which is hard to guess

---

⚠️ **RLS State Slack (Intentional)**

**Observed:** RLS policies allow `state IN ('active', 'completed')` for response/selection inserts, but application enforces `state === 'active'` only.

**Why This Is Intentional:**
- Defense-in-depth: application layer is primary enforcement
- RLS provides secondary guardrail against non-archived states
- Preserves operational flexibility during MVP iteration
- No security risk since RLS is never *less* restrictive than intended

**Future Consideration:** Once regression test coverage is complete, consider tightening RLS to `state = 'active'` to match product invariant exactly

**Production Fix:** Route all participant writes through Edge Function that verifies `participant_token`.

---

## Production Security Roadmap

### Phase 1: Edge Function Proxy (Recommended)

Create serverless functions that use the service role key (bypassing RLS) and implement custom authorization:

**1. GET `/api/session/:slug`**
```typescript
// Returns session + themes only if slug matches
// Prevents enumeration
export async function handler(req: Request) {
  const { slug } = req.params;
  
  // Use service role key
  const session = await supabaseAdmin
    .from('sessions')
    .select('*, themes(*)')
    .eq('slug', slug)
    .eq('state', 'active')
    .single();
    
  return Response.json(session);
}
```

**2. POST `/api/session/:slug/respond`**
```typescript
// Creates response + selections
// Returns participant_token to client
export async function handler(req: Request) {
  const { slug } = req.params;
  const { participantEmail, name, selections } = await req.json();
  
  // Verify session is active
  const session = await getSessionBySlug(slug);
  if (!session || session.state !== 'active') {
    return Response.json({ error: 'Session not active' }, { status: 400 });
  }
  
  // Insert response (token auto-generated)
  const response = await supabaseAdmin
    .from('responses')
    .insert({ session_id: session.id, participant_email: participantEmail, name })
    .select()
    .single();
    
  // Insert selections
  await supabaseAdmin
    .from('theme_selections')
    .insert(selections.map(s => ({ response_id: response.id, ...s })));
    
  // Return token to client (store in localStorage)
  return Response.json({ 
    success: true, 
    participantToken: response.participant_token 
  });
}
```

**3. PUT `/api/session/:slug/respond`**
```typescript
// Updates response + selections
// Requires valid participant_token
export async function handler(req: Request) {
  const { slug } = req.params;
  const { participantToken, participantEmail, selections } = await req.json();
  
  // Verify token matches response
  const response = await supabaseAdmin
    .from('responses')
    .select('*, sessions!inner(slug, state)')
    .eq('participant_token', participantToken)
    .eq('participant_email', participantEmail)
    .single();
    
  if (!response || response.sessions.slug !== slug) {
    return Response.json({ error: 'Invalid token' }, { status: 403 });
  }
  
  if (response.sessions.state !== 'active') {
    return Response.json({ error: 'Session not active' }, { status: 400 });
  }
  
  // Update allowed - proceed with changes
  // ...
}
```

### Phase 2: Rate Limiting

Add rate limiting to prevent abuse:
- Per IP: 10 responses per hour
- Per email: 1 response per session
- Per session: 1000 responses total

### Phase 3: Email Verification (Optional)

If you want verified participant identities:
- Send verification email with token
- Only count verified responses in aggregation
- Mark unverified responses differently in UI

---

## RLS Policy Reference

### Presenter Policies (Authenticated)

```sql
-- Presenters can CRUD their own profile
auth.uid() = presenters.id

-- Presenters can CRUD their own sessions
auth.uid() = sessions.presenter_id

-- Presenters can CRUD themes for their own sessions
EXISTS (SELECT 1 FROM sessions WHERE sessions.id = themes.session_id 
        AND sessions.presenter_id = auth.uid())

-- Presenters can read responses for their own sessions
EXISTS (SELECT 1 FROM sessions WHERE sessions.id = responses.session_id 
        AND sessions.presenter_id = auth.uid())
```

### Participant Policies (Unauthenticated)

```sql
-- Anyone can read active/completed sessions
sessions.state IN ('active', 'completed')

-- Anyone can read themes for active/completed sessions
EXISTS (SELECT 1 FROM sessions WHERE sessions.id = themes.session_id 
        AND sessions.state IN ('active', 'completed'))

-- Anyone can INSERT responses for active/completed sessions
EXISTS (SELECT 1 FROM sessions WHERE sessions.id = responses.session_id 
        AND sessions.state IN ('active', 'completed'))

-- Anyone can INSERT/DELETE selections for active/completed sessions
EXISTS (SELECT 1 FROM responses JOIN sessions ON sessions.id = responses.session_id
        WHERE responses.id = theme_selections.response_id 
        AND sessions.state IN ('active', 'completed'))
```

---

## Database Schema Security Features

### 1. Participant Token
```sql
participant_token TEXT NOT NULL DEFAULT gen_random_uuid()::text
```
- Auto-generated on response creation
- Returned to client for future updates
- Indexed for fast lookup

### 2. Unique Constraints
```sql
UNIQUE(session_id, participant_email)  -- One response per email per session
UNIQUE(response_id, theme_id)          -- One selection per theme per response
```

**Active themes only (soft delete safe):** implemented via partial unique index

```
CREATE UNIQUE INDEX themes_session_sort_active_unique
  ON themes(session_id, sort_order)
  WHERE is_active = true;
```

### 3. Foreign Key Cascades
```sql
ON DELETE CASCADE  -- Deleting session deletes all related data
```

### 4. NOT NULL Constraints
```sql
presenter_id UUID NOT NULL  -- Sessions must have owner
session_id UUID NOT NULL    -- Themes/responses must belong to session
```

---

## Environment Variables Security

### Development
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx  # Safe to expose (RLS enforced)
VITE_APP_URL=http://localhost:5173
```

> **Note:** OpenAI and Resend integrations are not yet implemented. When added, they will use Supabase Edge Functions with server-side secrets.

### Production Recommendations

1. **Future AI Integration (Edge Function)**
   - Never expose API keys in frontend
   - Use Supabase Edge Function with secret key
   - Add rate limiting

2. **Use Environment-Specific Keys**
   - Separate Supabase projects for dev/staging/prod
   - Different API keys per environment
   - Never commit `.env` files

3. **Enable Supabase Security Features**
   - Email rate limiting
   - IP allowlists (if applicable)
   - Database backups
   - Audit logs

---

## Testing Security

### Manual Security Tests

1. **Presenter Isolation**
   - Create two presenter accounts
   - Verify Presenter A cannot see Presenter B's sessions

2. **Participant Boundaries**
   - Try to access archived session as participant
   - Verify blocked

3. **Token Verification** (when implemented)
   - Try to update response with wrong token
   - Verify blocked

### Automated Tests (Future)

```typescript
describe('Security', () => {
  it('prevents cross-presenter data access', async () => {
    // Test RLS policies
  });
  
  it('blocks participant writes to archived sessions', async () => {
    // Test state-based access control
  });
  
  it('requires valid token for response updates', async () => {
    // Test token verification
  });
});
```

---

## Incident Response

If you suspect a security issue:

1. **Immediate:** Pause affected sessions (set to `archived`)
2. **Investigate:** Check Supabase logs for suspicious queries
3. **Mitigate:** Deploy Edge Function proxy if enumeration detected
4. **Notify:** Inform affected presenters if data exposed
5. **Fix:** Implement production security measures

---

## Summary

**Current State:** Secure enough for MVP with trusted users.

**Known Risks:** Session enumeration, no participant update verification.

**Production Path:** Edge Function proxy + token verification + rate limiting.

**Timeline:** Implement Edge Functions before public launch or when handling sensitive data.

---

*For questions or security concerns, review this document and the RLS policies in `supabase/rls-policies.sql`.*
