# Supabase Setup Guide - Step by Step

**Follow these instructions exactly in order.**

---

## Step 1: Create Supabase Account & Project

### 1.1 Sign Up
1. Go to https://supabase.com
2. Click **"Start your project"** or **"Sign in"**
3. Sign in with GitHub (recommended) or email

### 1.2 Create New Project
1. Click **"New Project"** (green button)
2. Select your organization (or create one)
3. Fill in project details:
   - **Name:** `feedbacker-app` (or whatever you prefer)
   - **Database Password:** Generate a strong password and SAVE IT
   - **Region:** Choose closest to you (e.g., `US East (North Virginia)`)
   - **Pricing Plan:** Free tier is fine for development
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to provision

### 1.3 Save Your Credentials
Once the project is ready, you'll see the dashboard. Keep this tab open.

---

## Step 2: Get Your API Keys

### 2.1 Navigate to Settings
1. In the left sidebar, click **"Project Settings"** (gear icon at bottom)
2. Click **"API"** in the settings menu

### 2.2 Copy Your Credentials
You'll see two important values:

**Project URL:**
```
https://xxxxxxxxxxxxx.supabase.co
```
Copy this - you'll need it for `VITE_SUPABASE_URL`

**anon public key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
```
Copy this - you'll need it for `VITE_SUPABASE_ANON_KEY`

⚠️ **DO NOT copy the `service_role` key** - that's for server-side only.

---

## Step 3: Run Database Schema

### 3.1 Open SQL Editor
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** (top right)

### 3.2 Run Schema SQL
1. Open the file: `supabase/schema.sql` in your project
2. Copy the ENTIRE contents (all 105 lines)
3. Paste into the SQL Editor
4. Click **"Run"** (or press Cmd/Ctrl + Enter)

**Expected Result:**
```
Success. No rows returned
```

### 3.3 Verify Tables Created
1. In the left sidebar, click **"Table Editor"**
2. You should see 5 tables:
   - `presenters`
   - `sessions`
   - `themes`
   - `responses`
   - `theme_selections`

If you see all 5 tables, ✅ **Schema is good!**

---

## Step 4: Run RLS Policies

### 4.1 Open New SQL Query
1. Go back to **"SQL Editor"**
2. Click **"New query"** again

### 4.2 Run RLS Policies SQL
1. Open the file: `supabase/rls-policies.sql` in your project
2. Copy the ENTIRE contents (all 226 lines)
3. Paste into the SQL Editor
4. Click **"Run"**

**Expected Result:**
```
Success. No rows returned
```

### 4.3 Verify Policies Created
1. In the left sidebar, click **"Authentication"**
2. Click **"Policies"** in the submenu
3. You should see policies for all 5 tables

If you see policies listed, ✅ **RLS is good!**

---

## Step 5: Configure Authentication

### 5.1 Set Site URL
1. In the left sidebar, click **"Authentication"**
2. Click **"URL Configuration"**
3. Find **"Site URL"** field
4. Enter: `http://localhost:5173`
5. Click **"Save"**

### 5.2 Add Redirect URLs
1. Scroll down to **"Redirect URLs"**
2. Click **"Add URL"**
3. Enter: `http://localhost:5173/auth/callback`
4. Click **"Save"**

### 5.3 Configure Email Templates (Optional but Recommended)
1. Click **"Email Templates"** in the Authentication menu
2. Click **"Magic Link"**
3. You can customize the email, but default is fine for now
4. Make sure it's enabled (toggle should be ON)

---

## Step 6: Test Database Connection

### 6.1 Quick Test Query
1. Go back to **"SQL Editor"**
2. Click **"New query"**
3. Paste this test query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```
4. Click **"Run"**

**Expected Result:**
You should see all 5 table names listed.

---

## Step 7: Update Your .env File

Now you're ready to configure your local environment.

### 7.1 Open .env File
In your project, open the `.env` file (it should already exist from `.env.example`)

### 7.2 Fill in Your Credentials
Replace the placeholder values with your actual credentials from Step 2:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Public URL for participant links (Required)
VITE_PUBLIC_BASE_URL=http://localhost:5173
```

> **Note:** OpenAI and Resend integrations are planned for future versions and will use server-side/Edge Functions (not client-side env vars).

### 7.3 Save the File
Make sure to save `.env` after updating.

---

## Step 8: Test Authentication Flow

### 8.1 Start Dev Server
```bash
npm run dev
```

### 8.2 Open Browser
Go to: http://localhost:5173

### 8.3 Test Magic Link
1. Enter your email address
2. Click **"Send magic link"**
3. Check your email (might be in spam)
4. Click the link in the email

**Expected Flow:**
1. Email sent confirmation appears
2. You receive email from Supabase
3. Click link → redirects to `/auth/callback`
4. Redirects to `/dashboard/profile` (first time)
5. Fill in name and organization
6. Click **"Complete setup"**
7. Redirects to `/dashboard`

If this works, ✅ **Authentication is working!**

---

## Troubleshooting

### Issue: "Magic link not received"
**Solutions:**
- Check spam folder
- Wait 1-2 minutes (email can be slow)
- Verify Site URL is `http://localhost:5173` in Supabase settings
- Check Supabase logs: Authentication → Logs

### Issue: "Error: row-level security"
**Solutions:**
- Make sure you ran BOTH `schema.sql` AND `rls-policies.sql`
- Verify policies exist: Authentication → Policies
- Check that all 5 tables have policies

### Issue: "Cannot read properties of null"
**Solutions:**
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Make sure you're using the **anon** key, not service_role
- Restart dev server after updating `.env`

### Issue: "Profile creation failed"
**Solutions:**
- Check browser console for errors
- Verify the `presenters` table exists
- Check that RLS policies allow INSERT with `auth.uid() = id`
- Verify `sessions.published_share_token` and `sessions.published_version` columns exist (tokenized share links)

---

## Verification Checklist

Before proceeding, verify:

- [ ] Supabase project created
- [ ] Project URL and anon key copied
- [ ] `schema.sql` executed successfully
- [ ] All 5 tables visible in Table Editor
- [ ] `rls-policies.sql` executed successfully
- [ ] Policies visible in Authentication → Policies
- [ ] Site URL set to `http://localhost:5173`
- [ ] Redirect URL added: `http://localhost:5173/auth/callback`
- [ ] `.env` file updated with credentials
- [ ] Dev server running
- [ ] Magic link email received
- [ ] Profile creation works
- [ ] Dashboard loads after login

---

## Next Steps After Supabase Setup

Once authentication is working:

1. **Start Using the App**
   - Dashboard with session list
   - Session creation
   - Results view

2. **Future: AI Features** (not yet implemented)
   - Will use Supabase Edge Functions
   - OpenAI key will be stored securely server-side

3. **Future: Custom Email** (not yet implemented)
   - Will use Supabase Edge Functions with Resend
   - API key will be stored securely server-side

---

**You're now ready to develop!** 🎉
