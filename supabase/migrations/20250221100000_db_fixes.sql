-- ============================================
-- DB FIXES: Collections, constraints, triggers, RLS, handle_new_user
-- ============================================

-- 1. Collections: Add description and updated_at
ALTER TABLE collections ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Collection items: Unique constraint (collection_id, media_id, media_type)
-- Skip if any duplicates exist - add constraint only when safe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM collection_items
    GROUP BY collection_id, media_id, media_type
    HAVING count(*) > 1
  ) THEN
    ALTER TABLE collection_items
      ADD CONSTRAINT collection_items_unique_media
      UNIQUE (collection_id, media_id, media_type);
  END IF;
EXCEPTION
  WHEN unique_violation THEN NULL; -- Constraint exists or duplicates present, skip
END $$;

-- 3. Follows: Prevent self-follow (remove existing self-follows first)
DELETE FROM follows WHERE follower_id = following_id;
ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_no_self_follow;
ALTER TABLE follows ADD CONSTRAINT follows_no_self_follow CHECK (follower_id != following_id);

-- 4. handle_new_user: Fix metadata key with fallbacks
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, username)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journeys_updated_at ON journeys;
CREATE TRIGGER journeys_updated_at
  BEFORE UPDATE ON journeys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS journey_progress_updated_at ON journey_progress;
CREATE TRIGGER journey_progress_updated_at
  BEFORE UPDATE ON journey_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS episode_progress_updated_at ON episode_progress;
CREATE TRIGGER episode_progress_updated_at
  BEFORE UPDATE ON episode_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Collections updated_at trigger
DROP TRIGGER IF EXISTS collections_updated_at ON collections;
CREATE TRIGGER collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. user_achievements: Restrict RLS - only own row for insert/update
DROP POLICY IF EXISTS "System can insert achievements" ON user_achievements;
DROP POLICY IF EXISTS "System can update achievements" ON user_achievements;

CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own achievements" ON user_achievements
  FOR UPDATE USING (user_id = (select auth.uid()));

-- 7. user_stats: Restrict RLS - only own row (was "for all using (true)")
DROP POLICY IF EXISTS "System can upsert stats" ON user_stats;
CREATE POLICY "Users can upsert own stats" ON user_stats
  FOR ALL USING (user_id = (select auth.uid()));
