-- Per-user watch status without requiring a Cravelist row (deduped into user_stats with collection_items)

CREATE TABLE public.user_media_status (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id text NOT NULL,
  media_type text NOT NULL,
  status text NOT NULL DEFAULT 'not_seen'
    CHECK (status = ANY (ARRAY[
      'not_seen'::text,
      'watching'::text,
      'on_hold'::text,
      'watched'::text,
      'dropped'::text,
      'not_interested'::text
    ])),
  finished_at timestamptz,
  runtime_minutes integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, media_id, media_type)
);

CREATE INDEX user_media_status_user_id_idx ON public.user_media_status (user_id);

ALTER TABLE public.user_media_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own user_media_status" ON public.user_media_status
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own user_media_status" ON public.user_media_status
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own user_media_status" ON public.user_media_status
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own user_media_status" ON public.user_media_status
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Dedupe watched titles across collection_items and user_media_status for counts and hours
CREATE OR REPLACE FUNCTION public.update_user_stats(p_user_id uuid)
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

  SELECT count(*) INTO v_total_items
  FROM journey_progress
  WHERE user_id = p_user_id AND status = 'completed';

  SELECT coalesce(sum(item_runtime_minutes) / 60.0, 0) INTO v_total_hours
  FROM journey_progress
  WHERE user_id = p_user_id AND status = 'completed';

  SELECT count(*)::integer INTO v_collection_items
  FROM (
    SELECT DISTINCT w.media_id, w.media_type
    FROM (
      SELECT ci.media_id, ci.media_type
      FROM collection_items ci
      JOIN collections c ON c.id = ci.collection_id
      WHERE c.user_id = p_user_id AND ci.status = 'watched'
      UNION
      SELECT ums.media_id, ums.media_type
      FROM user_media_status ums
      WHERE ums.user_id = p_user_id AND ums.status = 'watched'
    ) w
  ) deduped;

  SELECT coalesce(sum(coalesce(h.max_mins, 0) / 60.0), 0) INTO v_collection_hours
  FROM (
    SELECT (
      SELECT max(r.v)
      FROM (
        SELECT ci.runtime_minutes::numeric AS v
        FROM collection_items ci
        JOIN collections c ON c.id = ci.collection_id
        WHERE c.user_id = p_user_id
          AND ci.media_id = watch_pair.media_id
          AND ci.media_type = watch_pair.media_type
          AND ci.status = 'watched'
          AND ci.runtime_minutes IS NOT NULL
        UNION ALL
        SELECT ums.runtime_minutes::numeric
        FROM user_media_status ums
        WHERE ums.user_id = p_user_id
          AND ums.media_id = watch_pair.media_id
          AND ums.media_type = watch_pair.media_type
          AND ums.status = 'watched'
          AND ums.runtime_minutes IS NOT NULL
      ) r
    ) AS max_mins
    FROM (
      SELECT DISTINCT z.media_id, z.media_type
      FROM (
        SELECT ci.media_id, ci.media_type
        FROM collection_items ci
        JOIN collections c ON c.id = ci.collection_id
        WHERE c.user_id = p_user_id AND ci.status = 'watched'
        UNION
        SELECT ums.media_id, ums.media_type
        FROM user_media_status ums
        WHERE ums.user_id = p_user_id AND ums.status = 'watched'
      ) z
    ) watch_pair
  ) h;

  SELECT count(*) INTO v_episode_count
  FROM episode_progress
  WHERE user_id = p_user_id AND status = 'watched';

  SELECT coalesce(
    sum(coalesce(runtime_minutes, 42)) / 60.0,
    0
  ) INTO v_episode_hours
  FROM episode_progress
  WHERE user_id = p_user_id AND status = 'watched';

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

CREATE OR REPLACE FUNCTION public.user_media_status_refresh_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_user_stats(OLD.user_id);
  ELSE
    PERFORM public.update_user_stats(NEW.user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS user_media_status_refresh_stats ON public.user_media_status;
CREATE TRIGGER user_media_status_refresh_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.user_media_status
  FOR EACH ROW EXECUTE FUNCTION public.user_media_status_refresh_stats();
