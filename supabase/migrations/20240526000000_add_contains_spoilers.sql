-- Add contains_spoilers flag to collection_items for review spoiler warnings
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS contains_spoilers boolean DEFAULT false;
