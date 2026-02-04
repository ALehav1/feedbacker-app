-- BASELINE_LOCK: Frozen baseline file.
-- Changes require baseline exception process.
-- Allowed: comment/documentation updates that do not alter SQL statements.

-- Feedbacker App Database Schema
-- Run this in your Supabase SQL Editor

-- Enable pgcrypto extension (provides gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Presenters (users who create sessions)
-- NOTE: id must be supplied by client as auth.uid() - no default
CREATE TABLE presenters (
  id UUID PRIMARY KEY,  -- Must match auth.users.id
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  logo_url TEXT,
  brand_guidelines_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presenter_id UUID NOT NULL REFERENCES presenters(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'active', 'completed', 'archived')),
  length_minutes INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  welcome_message TEXT NOT NULL DEFAULT '',
  summary_full TEXT NOT NULL DEFAULT '',
  summary_condensed TEXT NOT NULL DEFAULT '',
  slug TEXT UNIQUE NOT NULL,
  topics_source TEXT,
  -- Published snapshot fields (what participants see)
  published_welcome_message TEXT,
  published_summary_condensed TEXT,
  published_summary_full TEXT,
  published_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  has_unpublished_changes BOOLEAN NOT NULL DEFAULT false,
  published_share_token TEXT,
  published_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Themes (generated from summary)
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Uniqueness enforced via partial index (active themes only)
);

-- Responses (participant feedback)
-- participant_email: used for uniqueness and returning participant detection
-- followup_email: optional different email for follow-up contact
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,  -- Renamed for clarity
  name TEXT,
  followup_email TEXT,  -- Renamed for clarity
  free_form_text TEXT,
  participant_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,  -- For update verification
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, participant_email)
);

-- Theme Selections (interest signals)
CREATE TABLE theme_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  selection TEXT NOT NULL CHECK (selection IN ('more', 'less')),
  UNIQUE(response_id, theme_id)
);

-- Indexes for performance
CREATE INDEX idx_sessions_presenter ON sessions(presenter_id);
CREATE INDEX idx_sessions_slug ON sessions(slug);
CREATE INDEX idx_sessions_state ON sessions(state);
CREATE INDEX idx_themes_session ON themes(session_id);
CREATE UNIQUE INDEX themes_session_sort_active_unique ON themes(session_id, sort_order) WHERE is_active = true;
CREATE INDEX idx_themes_session_active ON themes(session_id) WHERE is_active = true;
CREATE INDEX idx_responses_session ON responses(session_id);
CREATE INDEX idx_responses_email ON responses(session_id, participant_email);
CREATE INDEX idx_responses_token ON responses(participant_token);
CREATE INDEX idx_selections_response ON theme_selections(response_id);
CREATE INDEX idx_selections_theme ON theme_selections(theme_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_presenters_updated_at
  BEFORE UPDATE ON presenters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_responses_updated_at
  BEFORE UPDATE ON responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
