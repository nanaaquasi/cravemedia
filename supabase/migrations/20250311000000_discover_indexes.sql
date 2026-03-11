-- Indexes for Discover page queries (trending collections, featured journeys)
-- Optimizes: public collections by updated_at, public journeys by forked_count

CREATE INDEX IF NOT EXISTS idx_collections_public_updated
  ON public.collections (is_public, updated_at DESC)
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_journeys_public_forked
  ON public.journeys (is_public, forked_count DESC)
  WHERE is_public = true;
