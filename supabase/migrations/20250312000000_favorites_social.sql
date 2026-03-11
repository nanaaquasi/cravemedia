-- ============================================
-- FAVORITES, CONTENT_STATS, CONTENT_VIEWS
-- Social profile and popularity tracking
-- ============================================

-- 1a. favorites table
CREATE TABLE favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  title text,
  image_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_favorites_unique ON favorites(user_id, target_type, target_id);
CREATE INDEX idx_favorites_user ON favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_target ON favorites(target_type, target_id);

CREATE POLICY "Favorites are viewable by everyone"
  ON favorites FOR SELECT USING (true);

CREATE POLICY "Users can insert own favorites"
  ON favorites FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE USING (user_id = (select auth.uid()));

-- 1b. content_stats table
CREATE TABLE content_stats (
  target_type text NOT NULL,
  target_id text NOT NULL,
  favorites_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  saves_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (target_type, target_id)
);

ALTER TABLE content_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content stats are viewable by everyone"
  ON content_stats FOR SELECT USING (true);

-- 1c. content_views table
CREATE TABLE content_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_content_views_unique ON content_views(user_id, target_type, target_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_content_views_target ON content_views(target_type, target_id);

ALTER TABLE content_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own content views"
  ON content_views FOR INSERT WITH CHECK (user_id = (select auth.uid()) OR user_id IS NULL);

CREATE POLICY "Content views are not readable by users"
  ON content_views FOR SELECT USING (false);

-- 1d. Alter user_stats
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_favorites integer DEFAULT 0;

-- 1e. Update RLS for public profiles
CREATE POLICY "User stats are viewable by everyone"
  ON user_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Activities are viewable by user and their followers" ON activities;
CREATE POLICY "Activities are viewable by everyone"
  ON activities FOR SELECT USING (true);

-- ============================================
-- TRIGGERS: favorites -> content_stats
-- ============================================

CREATE OR REPLACE FUNCTION favorites_update_content_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO content_stats (target_type, target_id, favorites_count, updated_at)
    VALUES (NEW.target_type, NEW.target_id, 1, now())
    ON CONFLICT (target_type, target_id)
    DO UPDATE SET
      favorites_count = content_stats.favorites_count + 1,
      updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE content_stats
    SET favorites_count = GREATEST(0, favorites_count - 1),
        updated_at = now()
    WHERE target_type = OLD.target_type AND target_id = OLD.target_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_favorite_insert ON favorites;
CREATE TRIGGER on_favorite_insert
  AFTER INSERT ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION favorites_update_content_stats();

DROP TRIGGER IF EXISTS on_favorite_delete ON favorites;
CREATE TRIGGER on_favorite_delete
  AFTER DELETE ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION favorites_update_content_stats();

-- ============================================
-- TRIGGERS: favorites -> user_stats total_favorites
-- ============================================

CREATE OR REPLACE FUNCTION favorites_update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_stats (user_id, total_favorites, updated_at)
    VALUES (NEW.user_id, 1, now())
    ON CONFLICT (user_id) DO UPDATE SET
      total_favorites = user_stats.total_favorites + 1,
      updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_stats
    SET total_favorites = GREATEST(0, total_favorites - 1),
        updated_at = now()
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_favorite_user_stats_insert ON favorites;
CREATE TRIGGER on_favorite_user_stats_insert
  AFTER INSERT ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION favorites_update_user_stats();

DROP TRIGGER IF EXISTS on_favorite_user_stats_delete ON favorites;
CREATE TRIGGER on_favorite_user_stats_delete
  AFTER DELETE ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION favorites_update_user_stats();

-- ============================================
-- TRIGGERS: content_views -> content_stats
-- ============================================

CREATE OR REPLACE FUNCTION content_views_update_content_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO content_stats (target_type, target_id, views_count, updated_at)
  VALUES (NEW.target_type, NEW.target_id, 1, now())
  ON CONFLICT (target_type, target_id)
  DO UPDATE SET
    views_count = content_stats.views_count + 1,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_content_view_insert ON content_views;
CREATE TRIGGER on_content_view_insert
  AFTER INSERT ON content_views
  FOR EACH ROW
  EXECUTE FUNCTION content_views_update_content_stats();
