-- Migration: Add is_active soft-delete column to themes table
--
-- Purpose: Prevent CASCADE deletion of theme_selections (participant feedback)
-- when themes are edited. Instead of DELETE + reinsert, themes are soft-deleted
-- via is_active = false. This preserves all theme_selections rows for surviving themes.
--
-- Run this migration on all environments before deploying the diff-based theme save.

-- Step 1: Add is_active column (all existing themes default to active)
ALTER TABLE themes
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Step 2: Replace the hard UNIQUE constraint with a partial unique index
-- The old constraint enforced uniqueness across ALL rows (including soft-deleted).
-- The new partial index only constrains active themes, allowing soft-deleted themes
-- to coexist without sort_order conflicts.
ALTER TABLE themes DROP CONSTRAINT IF EXISTS themes_session_id_sort_order_key;

CREATE UNIQUE INDEX IF NOT EXISTS themes_session_sort_active_unique
  ON themes(session_id, sort_order)
  WHERE is_active = true;

-- Step 3: Performance index for filtering active themes per session
CREATE INDEX IF NOT EXISTS idx_themes_session_active
  ON themes(session_id)
  WHERE is_active = true;
