-- Link journeys created by promoting a collection (one promotion per collection)
ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS source_collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_journeys_source_collection
  ON journeys(source_collection_id)
  WHERE source_collection_id IS NOT NULL;
