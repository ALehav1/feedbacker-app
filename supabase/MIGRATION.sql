-- Migration: Add published snapshot columns to sessions table
-- Run this in Supabase SQL Editor to add published vs unpublished tracking

-- Add published snapshot columns
ALTER TABLE sessions 
  ADD COLUMN IF NOT EXISTS published_welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS published_summary_condensed TEXT,
  ADD COLUMN IF NOT EXISTS published_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS has_unpublished_changes BOOLEAN NOT NULL DEFAULT false;

-- Optional: For existing active sessions, populate published fields from working state
-- This ensures existing active sessions have a published snapshot
UPDATE sessions
SET 
  published_welcome_message = welcome_message,
  published_summary_condensed = summary_condensed,
  published_topics = (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id::text,
        'text', text,
        'sortOrder', sort_order
      ) ORDER BY sort_order
    )
    FROM themes
    WHERE themes.session_id = sessions.id
  ),
  published_at = NOW(),
  has_unpublished_changes = false
WHERE state IN ('active', 'completed')
  AND published_at IS NULL;

-- Verification queries (optional - run after migration)
-- Check that all active sessions have published snapshots:
-- SELECT id, state, published_at, has_unpublished_changes FROM sessions WHERE state = 'active';
-- 
-- Check published_topics structure:
-- SELECT id, published_topics FROM sessions WHERE state = 'active' LIMIT 1;
