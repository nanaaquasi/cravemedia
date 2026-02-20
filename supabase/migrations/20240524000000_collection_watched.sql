-- ============================================
-- COLLECTION ITEMS: Add watched/read tracking
-- ============================================

-- Add columns to collection_items
alter table collection_items
  add column if not exists position integer,
  add column if not exists status text default 'unfinished',
  add column if not exists finished_at timestamp with time zone,
  add column if not exists item_rating decimal(2,1),
  add column if not exists review_text text,
  add column if not exists runtime_minutes integer;

-- Backfill status for existing rows (treat null as unfinished)
update collection_items set status = 'unfinished' where status is null;

-- RLS: Add update policy so owners can update their own collection items
drop policy if exists "Users can update items in own collections" on collection_items;
create policy "Users can update items in own collections" on collection_items
  for update using (
    exists (
      select 1 from collections
      where collections.id = collection_items.collection_id
      and collections.user_id = (select auth.uid())
    )
  );

-- ============================================
-- Trigger: Create activity when collection item marked finished
-- ============================================
create or replace function create_collection_item_activity()
returns trigger as $$
declare
  v_user_id uuid;
  v_title text;
  v_media_type text;
begin
  if old.status is distinct from 'finished' and new.status = 'finished' then
    -- Get user_id and item details from collection
    select c.user_id into v_user_id
    from collections c
    where c.id = new.collection_id;

    v_title := coalesce(new.title, 'Untitled');
    v_media_type := coalesce(new.media_type, 'movie');

    insert into activities (
      user_id,
      activity_type,
      journey_id,
      item_title,
      item_position,
      rating,
      review_text,
      metadata
    ) values (
      v_user_id,
      'item_completed',
      null,
      v_title,
      null,
      new.item_rating,
      new.review_text,
      jsonb_build_object(
        'source', 'collection',
        'collection_id', new.collection_id,
        'collection_item_id', new.id,
        'media_type', v_media_type
      )
    );

    -- Update streak and stats
    perform update_user_streak(v_user_id);
    perform update_user_stats(v_user_id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_collection_item_finished on collection_items;
create trigger on_collection_item_finished
  after update on collection_items
  for each row
  when (old.status is distinct from new.status)
  execute function create_collection_item_activity();

-- ============================================
-- Update update_user_stats to include collection items
-- ============================================
create or replace function update_user_stats(p_user_id uuid)
returns void as $$
declare
  v_completed_count integer;
  v_in_progress_count integer;
  v_total_items integer;
  v_total_hours decimal;
  v_avg_journey_rating decimal;
  v_completion_rate decimal;
  v_collection_items integer;
  v_collection_hours decimal;
begin
  -- Count completed journeys
  select count(*) into v_completed_count
  from journeys
  where user_id = p_user_id and status = 'completed';

  -- Count in-progress journeys
  select count(*) into v_in_progress_count
  from journeys
  where user_id = p_user_id and status = 'in_progress';

  -- Total items from journey_progress
  select count(*) into v_total_items
  from journey_progress
  where user_id = p_user_id and status = 'completed';

  -- Total hours from journey_progress
  select coalesce(sum(item_runtime_minutes) / 60.0, 0) into v_total_hours
  from journey_progress
  where user_id = p_user_id and status = 'completed';

  -- Add collection items (finished) to totals
  select count(*) into v_collection_items
  from collection_items ci
  join collections c on c.id = ci.collection_id
  where c.user_id = p_user_id and ci.status = 'finished';

  select coalesce(sum(ci.runtime_minutes) / 60.0, 0) into v_collection_hours
  from collection_items ci
  join collections c on c.id = ci.collection_id
  where c.user_id = p_user_id and ci.status = 'finished';

  v_total_items := v_total_items + v_collection_items;
  v_total_hours := v_total_hours + v_collection_hours;

  -- Average journey rating
  select avg(overall_rating) into v_avg_journey_rating
  from journeys
  where user_id = p_user_id and overall_rating is not null;

  -- Completion rate
  select
    case
      when count(*) > 0 then (count(*) filter (where status = 'completed')::decimal / count(*) * 100)
      else 0
    end into v_completion_rate
  from journeys
  where user_id = p_user_id and status in ('completed', 'abandoned');

  -- Upsert stats
  insert into user_stats (
    user_id,
    total_journeys_completed,
    total_journeys_in_progress,
    total_items_watched,
    total_hours_watched,
    average_journey_rating,
    journey_completion_rate,
    updated_at
  ) values (
    p_user_id,
    v_completed_count,
    v_in_progress_count,
    v_total_items,
    v_total_hours,
    v_avg_journey_rating,
    v_completion_rate,
    now()
  )
  on conflict (user_id) do update set
    total_journeys_completed = excluded.total_journeys_completed,
    total_journeys_in_progress = excluded.total_journeys_in_progress,
    total_items_watched = excluded.total_items_watched,
    total_hours_watched = excluded.total_hours_watched,
    average_journey_rating = excluded.average_journey_rating,
    journey_completion_rate = excluded.journey_completion_rate,
    updated_at = now();
end;
$$ language plpgsql security definer;
