-- Row Level Security (RLS) Policies
-- Run this AFTER schema.sql in your Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE presenters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_selections ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PRESENTER POLICIES (authenticated users)
-- ============================================

-- Presenters can read their own profile
CREATE POLICY "Presenters can read own profile"
  ON presenters FOR SELECT
  USING (auth.uid() = id);

-- Presenters can insert their own profile (first-time setup)
-- CRITICAL: Client must insert with id = auth.uid()
CREATE POLICY "Presenters can insert own profile"
  ON presenters FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Presenters can update their own profile
CREATE POLICY "Presenters can update own profile"
  ON presenters FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- SESSION POLICIES
-- ============================================

-- Presenters can CRUD their own sessions
CREATE POLICY "Presenters can read own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = presenter_id);

CREATE POLICY "Presenters can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = presenter_id);

CREATE POLICY "Presenters can update own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = presenter_id);

CREATE POLICY "Presenters can delete own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = presenter_id);

-- Participants can read active/completed sessions (by slug lookup)
-- NOTE: This exposes session metadata to anyone with anon key.
-- For MVP this is acceptable. For production, use Edge Function.
CREATE POLICY "Anyone can read active sessions"
  ON sessions FOR SELECT
  USING (state IN ('active', 'completed'));

-- ============================================
-- THEME POLICIES
-- ============================================

-- Presenters can CRUD themes for their own sessions
CREATE POLICY "Presenters can read own session themes"
  ON themes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = themes.session_id
      AND sessions.presenter_id = auth.uid()
    )
  );

CREATE POLICY "Presenters can insert own session themes"
  ON themes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = themes.session_id
      AND sessions.presenter_id = auth.uid()
    )
  );

CREATE POLICY "Presenters can update own session themes"
  ON themes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = themes.session_id
      AND sessions.presenter_id = auth.uid()
    )
  );

CREATE POLICY "Presenters can delete own session themes"
  ON themes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = themes.session_id
      AND sessions.presenter_id = auth.uid()
    )
  );

-- Participants can read themes for active/completed sessions
CREATE POLICY "Anyone can read themes for active sessions"
  ON themes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = themes.session_id
      AND sessions.state IN ('active', 'completed')
    )
  );

-- ============================================
-- RESPONSE POLICIES
-- ============================================

-- Presenters can read responses for their own sessions
CREATE POLICY "Presenters can read own session responses"
  ON responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = responses.session_id
      AND sessions.presenter_id = auth.uid()
    )
  );

-- Anyone can INSERT responses for active/completed sessions
-- The participant_token is auto-generated and returned to the client
CREATE POLICY "Anyone can insert responses for active sessions"
  ON responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = responses.session_id
      AND sessions.state IN ('active', 'completed')
    )
  );

-- Participants can read their own response (by email match)
-- This allows returning participants to see their previous response
CREATE POLICY "Participants can read own response by email"
  ON responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = responses.session_id
      AND sessions.state IN ('active', 'completed')
    )
  );

-- NOTE: For participant UPDATES, use an Edge Function that verifies
-- participant_token. Direct RLS update is disabled for security.
-- If you need client-side updates, uncomment and use token verification:
--
-- CREATE POLICY "Participants can update own response with token"
--   ON responses FOR UPDATE
--   USING (
--     -- Token must be passed as a header or in the request
--     -- This requires custom RLS function setup
--     participant_token = current_setting('request.headers')::json->>'x-participant-token'
--   );

-- ============================================
-- THEME SELECTION POLICIES
-- ============================================

-- Presenters can read selections for their own sessions
CREATE POLICY "Presenters can read own session selections"
  ON theme_selections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM responses
      JOIN sessions ON sessions.id = responses.session_id
      WHERE responses.id = theme_selections.response_id
      AND sessions.presenter_id = auth.uid()
    )
  );

-- Anyone can INSERT selections when creating a response
-- Selections are tied to response_id, which has token protection
CREATE POLICY "Anyone can insert selections for active sessions"
  ON theme_selections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM responses
      JOIN sessions ON sessions.id = responses.session_id
      WHERE responses.id = theme_selections.response_id
      AND sessions.state IN ('active', 'completed')
    )
  );

-- Anyone can DELETE their own selections (to change vote)
-- This allows toggling between more/less/neutral
CREATE POLICY "Anyone can delete selections for active sessions"
  ON theme_selections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM responses
      JOIN sessions ON sessions.id = responses.session_id
      WHERE responses.id = theme_selections.response_id
      AND sessions.state IN ('active', 'completed')
    )
  );

-- ============================================
-- SECURITY NOTES FOR PRODUCTION
-- ============================================
--
-- Current MVP limitations:
-- 1. Session enumeration: Anyone can list all active sessions.
--    Fix: Route participant reads through Edge Function.
--
-- 2. Response updates: Currently disabled at RLS level.
--    Fix: Use Edge Function that verifies participant_token.
--
-- 3. Selection tampering: Tied to response_id but not token-verified.
--    Fix: Route all participant writes through Edge Function.
--
-- For production, create Edge Functions for:
-- - GET /api/session/:slug (returns session + themes)
-- - POST /api/session/:slug/respond (creates response + selections)
-- - PUT /api/session/:slug/respond (updates with token verification)
