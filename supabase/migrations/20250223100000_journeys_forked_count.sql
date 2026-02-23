-- Add forked_count to journeys for popularity ranking
ALTER TABLE journeys ADD COLUMN IF NOT EXISTS forked_count integer NOT NULL DEFAULT 0;

-- Backfill forked_count from existing forks
UPDATE journeys j
SET forked_count = sub.cnt
FROM (
  SELECT forked_from AS id, COUNT(*)::integer AS cnt
  FROM journeys
  WHERE forked_from IS NOT NULL
  GROUP BY forked_from
) sub
WHERE j.id = sub.id;

-- Trigger: increment parent's forked_count when a journey is forked
CREATE OR REPLACE FUNCTION journeys_increment_forked_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.forked_from IS NOT NULL THEN
    UPDATE journeys SET forked_count = forked_count + 1 WHERE id = NEW.forked_from;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_journey_forked ON journeys;
CREATE TRIGGER on_journey_forked
  AFTER INSERT ON journeys
  FOR EACH ROW
  EXECUTE FUNCTION journeys_increment_forked_count();

-- Trigger: decrement parent's forked_count when a forked journey is deleted
CREATE OR REPLACE FUNCTION journeys_decrement_forked_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.forked_from IS NOT NULL THEN
    UPDATE journeys SET forked_count = GREATEST(0, forked_count - 1) WHERE id = OLD.forked_from;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_journey_fork_deleted ON journeys;
CREATE TRIGGER on_journey_fork_deleted
  AFTER DELETE ON journeys
  FOR EACH ROW
  EXECUTE FUNCTION journeys_decrement_forked_count();

-- Index for ordering by popularity
CREATE INDEX IF NOT EXISTS journeys_forked_count_idx ON journeys(forked_count DESC) WHERE is_public = true;
