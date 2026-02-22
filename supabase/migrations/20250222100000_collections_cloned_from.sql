-- Add cloned_from to track which collection was the source when cloning.
-- Enables "already saved" detection and prevents duplicate clones.
ALTER TABLE collections ADD COLUMN IF NOT EXISTS cloned_from uuid REFERENCES collections(id);
CREATE INDEX IF NOT EXISTS idx_collections_cloned_from ON collections(cloned_from);
CREATE INDEX IF NOT EXISTS idx_collections_user_cloned ON collections(user_id, cloned_from) WHERE cloned_from IS NOT NULL;
