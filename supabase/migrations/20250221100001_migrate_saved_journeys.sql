-- ============================================
-- Migrate saved_journeys to journeys, then drop legacy table
-- ============================================

-- Migrate data: saved_journeys -> journeys (only if table exists)
-- Map: title, query, user_id, created_at; results -> items; refinement_steps -> intent_answers
INSERT INTO journeys (
  id,
  user_id,
  title,
  description,
  query,
  content_type,
  intent_answers,
  items,
  status,
  is_public,
  is_created_by_user,
  created_at,
  updated_at
)
SELECT
  sj.id,
  sj.user_id,
  sj.title,
  coalesce(sj.goal_amount::text || ' ' || coalesce(sj.goal_unit, ''), '') as description,
  sj.query,
  'movies' as content_type,
  sj.refinement_steps as intent_answers,
  coalesce(sj.results, '[]'::jsonb) as items,
  'wishlist' as status,
  false as is_public,
  false as is_created_by_user,
  sj.created_at,
  sj.created_at as updated_at
FROM saved_journeys sj
ON CONFLICT (id) DO NOTHING;

-- Drop legacy table (policies dropped automatically)
DROP TABLE IF EXISTS saved_journeys;