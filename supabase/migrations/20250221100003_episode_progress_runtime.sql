-- Add runtime_minutes to episode_progress for accurate stats
ALTER TABLE episode_progress
  ADD COLUMN IF NOT EXISTS runtime_minutes integer;
