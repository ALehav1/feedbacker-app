-- Add topics_source column to track whether topics are generated or manually edited
-- This determines whether outline edits should regenerate topics automatically

ALTER TABLE sessions 
ADD COLUMN topics_source TEXT NOT NULL DEFAULT 'generated' 
CHECK (topics_source IN ('generated', 'manual'));

-- Add comment for clarity
COMMENT ON COLUMN sessions.topics_source IS 'Tracks whether topics are generated from outline or manually edited. generated = auto-regenerate on outline changes, manual = preserve edits';
