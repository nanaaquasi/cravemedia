-- ============================================
-- Include episode_progress in update_user_stats
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
  v_episode_count integer;
  v_episode_hours decimal;
BEGIN
  SELECT count(*) INTO v_completed_count
  FROM journeys
  WHERE user_id = p_user_id AND status = 'completed';

  SELECT count(*) INTO v_in_progress_count
  FROM journeys
  WHERE user_id = p_user_id AND status = 'in_progress';

  -- Journey progress (completed items)
  SELECT count(*) INTO v_total_items
  FROM journey_progress
  WHERE user_id = p_user_id AND status = 'completed';

  SELECT coalesce(sum(item_runtime_minutes) / 60.0, 0) INTO v_total_hours
  FROM journey_progress
  WHERE user_id = p_user_id AND status = 'completed';

  -- Collection items (watched)
  SELECT count(*) INTO v_collection_items
  FROM collection_items ci
  JOIN collections c ON c.id = ci.collection_id
  WHERE c.user_id = p_user_id AND ci.status = 'watched';

  SELECT coalesce(sum(ci.runtime_minutes) / 60.0, 0) INTO v_collection_hours
  FROM collection_items ci
  JOIN collections c ON c.id = ci.collection_id
  WHERE c.user_id = p_user_id AND ci.status = 'watched';

  -- Episode progress (watched episodes)
  SELECT count(*) INTO v_episode_count
  FROM episode_progress
  WHERE user_id = p_user_id AND status = 'watched';

  -- 42 min average per TV episode (episode_progress has no runtime)
  v_episode_hours := (v_episode_count * 42) / 60.0;

  v_total_items := v_total_items + v_collection_items + v_episode_count;
  v_total_hours := v_total_hours + v_collection_hours + v_episode_hours;

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

-- Trigger: Update stats when episode progress changes
CREATE OR REPLACE FUNCTION on_episode_progress_change()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT: new row with status watched
  IF TG_OP = 'INSERT' AND NEW.status = 'watched' THEN
    PERFORM update_user_stats(NEW.user_id);
    RETURN NEW;
  END IF;

  -- UPDATE: status changed to or from watched
  IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM update_user_stats(NEW.user_id);
    RETURN NEW;
  END IF;

  -- DELETE: was a watched episode
  IF TG_OP = 'DELETE' AND OLD.status = 'watched' THEN
    PERFORM update_user_stats(OLD.user_id);
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_episode_progress_change ON episode_progress;
CREATE TRIGGER on_episode_progress_change
  AFTER INSERT OR UPDATE OR DELETE ON episode_progress
  FOR EACH ROW EXECUTE FUNCTION on_episode_progress_change();
