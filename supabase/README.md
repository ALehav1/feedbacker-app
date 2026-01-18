# Supabase Database Setup

## ⚠️ Critical Implementation Notes

**Before you begin, understand these requirements:**

1. **Presenter ID = Auth User ID**
   - When creating a presenter profile, you MUST set `id = auth.uid()`
   - The ProfileSetup component handles this correctly
   - Never let the database auto-generate presenter IDs

2. **Security Model**
   - RLS policies enforce presenter data isolation
   - Participants have limited access (no auth required)
   - See `docs/SECURITY.md` for full details

3. **MVP Limitations**
   - Session enumeration possible (acceptable for MVP)
   - Participant updates disabled (prevents tampering)
   - Production requires Edge Functions (see security docs)

---

## Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Save your project URL and anon key

### 2. Run Schema
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `schema.sql`
5. Click **Run**
6. Verify tables were created in the **Table Editor**

### 3. Run RLS Policies
1. In the **SQL Editor**, create another new query
2. Copy and paste the contents of `rls-policies.sql`
3. Click **Run**
4. Verify policies in **Authentication** → **Policies**

### 4. Configure Magic Link Email
1. Go to **Authentication** → **Email Templates**
2. Customize the magic link email template (optional)
3. Go to **Authentication** → **URL Configuration**
4. Set **Site URL** to `http://localhost:5173` (development)
5. Add **Redirect URLs**: `http://localhost:5173/auth/callback`

### 5. Update Environment Variables
Update your `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 6. Test Connection
Run the dev server and check the console for any connection errors:

```bash
npm run dev
```

## Database Schema Overview

### Tables
- **presenters** - User profiles (authenticated via magic link)
- **sessions** - Presentation sessions with state machine
- **themes** - AI-generated themes per session
- **responses** - Participant feedback
- **theme_selections** - Interest signals (more/less per theme)

### State Machine
Sessions follow this flow:
```
draft → active → completed → archived
```

### Security
- Row Level Security (RLS) enabled on all tables
- Presenters can only access their own data
- Participants can access active/completed sessions
- No authentication required for participants (email-only)

## Troubleshooting

### Connection Issues
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check Supabase project is not paused
- Ensure you're using the **anon** key, not the **service_role** key

### RLS Errors
- If you see "row-level security" errors, verify policies are applied
- Check that `auth.uid()` matches the presenter's `id` field
- For testing, you can temporarily disable RLS (not recommended for production)

### Magic Link Not Working
- Verify redirect URL is configured in Supabase dashboard
- Check spam folder for magic link emails
- Ensure Site URL matches your app URL
