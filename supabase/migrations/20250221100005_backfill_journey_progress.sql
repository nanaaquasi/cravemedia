-- Backfill journey_progress for existing journeys that don't have any rows
-- (journeys saved before we added progress creation on save)

INSERT INTO journey_progress (
  journey_id,
  user_id,
  item_position,
  item_title,
  item_year,
  item_runtime_minutes,
  status
)
SELECT
  j.id,
  j.user_id,
  COALESCE((elem->>'position')::int, ord::int),
  COALESCE(elem->>'title', 'Untitled'),
  (elem->>'year')::int,
  CASE
    WHEN elem->>'runtime' ~ '\d+\s*min' THEN (regexp_match(elem->>'runtime', '(\d+)\s*min'))[1]::int
    WHEN elem->>'runtime' ~ '\d+\s*pages?' THEN (regexp_match(elem->>'runtime', '(\d+)\s*pages?', 'i'))[1]::int * 2
    ELSE NULL
  END,
  CASE WHEN ord = 1 THEN 'current' ELSE 'locked' END
FROM journeys j
CROSS JOIN LATERAL jsonb_array_elements(j.items) WITH ORDINALITY AS t(elem, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM journey_progress jp WHERE jp.journey_id = j.id
);
