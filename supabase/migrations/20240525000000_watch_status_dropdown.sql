-- ============================================
-- Watch Status Dropdown: Migrate status values
-- ============================================

-- Migrate old values to new status set
UPDATE collection_items SET status = 'not_seen' WHERE status = 'unfinished' OR status IS NULL;
UPDATE collection_items SET status = 'watched' WHERE status = 'finished';

-- Set new default
ALTER TABLE collection_items ALTER COLUMN status SET DEFAULT 'not_seen';

-- ============================================
-- Trigger: Fire on 'watched' instead of 'finished'
-- ============================================
CREATE OR REPLACE FUNCTION create_collection_item_activity()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_title text;
  v_media_type text;
BEGIN
  IF old.status IS DISTINCT FROM 'watched' AND new.status = 'watched' THEN
    SELECT c.user_id INTO v_user_id
    FROM collections c
    WHERE c.id = new.collection_id;

    v_title := coalesce(new.title, 'Untitled');
    v_media_type := coalesce(new.media_type, 'movie');

    INSERT INTO activities (
      user_id,
      activity_type,
      journey_id,
      item_title,
      item_position,
      rating,
      review_text,
      metadata
    ) VALUES (
      v_user_id,
      'item_completed',
      NULL,
      v_title,
      NULL,
      new.item_rating,
      new.review_text,
      jsonb_build_object(
        'source', 'collection',
        'collection_id', new.collection_id,
        'collection_item_id', new.id,
        'media_type', v_media_type
      )
    );

    PERFORM update_user_streak(v_user_id);
    PERFORM update_user_stats(v_user_id);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Update update_user_stats: count 'watched' instead of 'finished'
-- ============================================
CREATE OR REPLACE FUNCTION update_user_stats(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_completed_count integer;
  v_in_progress_count integer;
  v_total_items integer;
  v_total_hours decimal;
  v_avg_journey_rating decimal;
  v_completion_rate decimal;
  v_collection_items integer;
  v_collection_hours decimal;
BEGIN
  SELECT count(*) INTO v_completed_count
  FROM journeys
  WHERE user_id = p_user_id AND status = 'completed';

  SELECT count(*) INTO v_in_progress_count
  FROM journeys
  WHERE user_id = p_user_id AND status = 'in_progress';

  SELECT count(*) INTO v_total_items
  FROM journey_progress
  WHERE user_id = p_user_id AND status = 'completed';

  SELECT coalesce(sum(item_runtime_minutes) / 60.0, 0) INTO v_total_hours
  FROM journey_progress
  WHERE user_id = p_user_id AND status = 'completed';

  -- Add collection items (watched) to totals
  SELECT count(*) INTO v_collection_items
  FROM collection_items ci
  JOIN collections c ON c.id = ci.collection_id
  WHERE c.user_id = p_user_id AND ci.status = 'watched';

  SELECT coalesce(sum(ci.runtime_minutes) / 60.0, 0) INTO v_collection_hours
  FROM collection_items ci
  JOIN collections c ON c.id = ci.collection_id
  WHERE c.user_id = p_user_id AND ci.status = 'watched';

  v_total_items := v_total_items + v_collection_items;
  v_total_hours := v_total_hours + v_collection_hours;

  SELECT avg(overall_rating) INTO v_avg_journey_rating
  FROM journeys
  WHERE user_id = p_user_id AND overall_rating IS NOT NULL;

  SELECT
    CASE
      WHEN count(*) > 0 THEN (count(*) FILTER (WHERE status = 'completed')::decimal / count(*) * 100)
      ELSE 0
    END INTO v_completion_rate
  FROM journeys
  WHERE user_id = p_user_id AND status IN ('completed', 'abandoned');

  INSERT INTO user_stats (
    user_id,
    total_journeys_completed,
    total_journeys_in_progress,
    total_items_watched,
    total_hours_watched,
    average_journey_rating,
    journey_completion_rate,
    updated_at
  ) VALUES (
    p_user_id,
    v_completed_count,
    v_in_progress_count,
    v_total_items,
    v_total_hours,
    v_avg_journey_rating,
    v_completion_rate,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_journeys_completed = excluded.total_journeys_completed,
    total_journeys_in_progress = excluded.total_journeys_in_progress,
    total_items_watched = excluded.total_items_watched,
    total_hours_watched = excluded.total_hours_watched,
    average_journey_rating = excluded.average_journey_rating,
    journey_completion_rate = excluded.journey_completion_rate,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
