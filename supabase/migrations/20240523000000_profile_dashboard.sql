-- ============================================
-- JOURNEYS TABLE (Enhanced from saved_journeys)
-- ============================================
-- Note: You may want to migrate saved_journeys to this structure
create table if not exists journeys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  query text not null,
  content_type text not null, -- 'movies', 'tv', 'books'
  
  -- Journey metadata
  total_items integer default 0,
  total_runtime_minutes integer,
  difficulty_progression text, -- 'beginner → advanced'
  
  -- Intent data from questions
  intent_answers jsonb, -- Stores user's answers to refinement questions
  
  -- Journey items
  items jsonb not null, -- Array of journey items with transitions
  alternative_paths jsonb, -- Alternative branches
  
  -- Status tracking
  status text default 'wishlist', -- 'wishlist', 'in_progress', 'completed', 'abandoned'
  current_position integer default 0, -- Which item they're on (0-indexed)
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  
  -- Ratings
  overall_rating decimal(2,1), -- User's rating of the journey (1-5)
  sequence_rating decimal(2,1), -- How well did the sequence work? (1-5)
  
  -- Social
  is_public boolean default false,
  is_created_by_user boolean default false, -- true if user created this journey
  forked_from uuid references journeys(id), -- if remixed from another journey
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table journeys enable row level security;

create policy "Public journeys are viewable by everyone" on journeys
  for select using (is_public = true or user_id = (select auth.uid()));

create policy "Users can create journeys" on journeys
  for insert with check (user_id = (select auth.uid()));

create policy "Users can update own journeys" on journeys
  for update using (user_id = (select auth.uid()));

create policy "Users can delete own journeys" on journeys
  for delete using (user_id = (select auth.uid()));

-- Index for performance
create index if not exists journeys_user_id_idx on journeys(user_id);
create index if not exists journeys_status_idx on journeys(status);
create index if not exists journeys_public_idx on journeys(is_public) where is_public = true;


-- ============================================
-- JOURNEY PROGRESS TABLE (Track each item)
-- ============================================
create table if not exists journey_progress (
  id uuid default gen_random_uuid() primary key,
  journey_id uuid references journeys(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  item_position integer not null, -- Which item in the journey (0-indexed)
  
  -- Item details (denormalized for easy access)
  item_title text not null,
  item_year integer,
  item_runtime_minutes integer,
  
  -- Status
  status text default 'locked', -- 'locked', 'available', 'current', 'completed', 'skipped'
  
  -- Rating & Review
  item_rating decimal(2,1), -- Rating for this specific item (1-5)
  sequence_fit_rating decimal(2,1), -- How well did it fit in the sequence? (1-5)
  review_text text, -- Max 280 characters
  
  -- Timestamps
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  skipped_at timestamp with time zone,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  unique(journey_id, item_position)
);

alter table journey_progress enable row level security;

create policy "Users can view own progress" on journey_progress
  for select using (user_id = (select auth.uid()));

create policy "Users can create own progress" on journey_progress
  for insert with check (user_id = (select auth.uid()));

create policy "Users can update own progress" on journey_progress
  for update using (user_id = (select auth.uid()));

-- Index for performance
create index if not exists journey_progress_journey_id_idx on journey_progress(journey_id);
create index if not exists journey_progress_user_id_idx on journey_progress(user_id);


-- ============================================
-- ACTIVITY FEED TABLE
-- ============================================
create table if not exists activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  activity_type text not null, -- 'journey_started', 'journey_completed', 'item_completed', 'review_posted', 'badge_earned', 'journey_created'
  
  -- Activity data
  journey_id uuid references journeys(id) on delete cascade,
  item_title text,
  item_position integer,
  rating decimal(2,1),
  review_text text,
  badge_id text,
  
  -- Metadata
  metadata jsonb, -- Additional flexible data
  
  created_at timestamp with time zone default now()
);

alter table activities enable row level security;

create policy "Activities are viewable by user and their followers" on activities
  for select using (
    user_id = (select auth.uid()) 
    or exists (
      select 1 from follows 
      where follows.following_id = activities.user_id 
      and follows.follower_id = (select auth.uid())
    )
  );

create policy "Users can create own activities" on activities
  for insert with check (user_id = (select auth.uid()));

-- Index for feed performance
create index if not exists activities_user_id_created_idx on activities(user_id, created_at desc);
create index if not exists activities_created_at_idx on activities(created_at desc);


-- ============================================
-- ACHIEVEMENTS/BADGES TABLE
-- ============================================
create table if not exists user_achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  achievement_id text not null, -- 'first_journey', 'completionist', 'speed_runner', etc.
  
  -- Progress
  progress integer default 0,
  target integer not null,
  unlocked boolean default false,
  
  unlocked_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  
  unique(user_id, achievement_id)
);

alter table user_achievements enable row level security;

create policy "Users can view own achievements" on user_achievements
  for select using (user_id = (select auth.uid()));

create policy "System can insert achievements" on user_achievements
  for insert with check (true); -- Will be handled by backend logic

create policy "System can update achievements" on user_achievements
  for update using (true); -- Will be handled by backend logic

-- Index for performance
create index if not exists user_achievements_user_id_idx on user_achievements(user_id);


-- ============================================
-- USER STATS TABLE (Aggregated metrics)
-- ============================================
create table if not exists user_stats (
  user_id uuid references profiles(id) on delete cascade not null primary key,
  
  -- Journey stats
  total_journeys_completed integer default 0,
  total_journeys_in_progress integer default 0,
  total_items_watched integer default 0,
  total_hours_watched decimal(10,2) default 0,
  
  -- Ratings
  average_journey_rating decimal(2,1),
  average_item_rating decimal(2,1),
  
  -- Streaks
  current_streak_days integer default 0,
  longest_streak_days integer default 0,
  last_activity_date date,
  
  -- Completion rate
  journey_completion_rate decimal(5,2), -- Percentage
  
  -- Genre breakdown (top 5)
  top_genres jsonb, -- [{"genre": "Thriller", "count": 42, "percentage": 35}, ...]
  
  -- Achievements
  total_badges_unlocked integer default 0,
  
  updated_at timestamp with time zone default now()
);

alter table user_stats enable row level security;

create policy "Users can view own stats" on user_stats
  for select using (user_id = (select auth.uid()));

create policy "System can upsert stats" on user_stats
  for all using (true); -- Will be updated by triggers/functions


-- ============================================
-- SOCIAL INTERACTIONS TABLE
-- ============================================
create table if not exists interactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  target_type text not null, -- 'activity', 'journey', 'review'
  target_id uuid not null,
  interaction_type text not null, -- 'like', 'comment', 'share'
  
  -- For comments
  comment_text text,
  
  created_at timestamp with time zone default now()
);

alter table interactions enable row level security;

create policy "Interactions are viewable by everyone" on interactions
  for select using (true);

create policy "Users can create interactions" on interactions
  for insert with check (user_id = (select auth.uid()));

create policy "Users can delete own interactions" on interactions
  for delete using (user_id = (select auth.uid()));

-- Index for performance
create index if not exists interactions_target_idx on interactions(target_type, target_id);
create index if not exists interactions_user_id_idx on interactions(user_id);


-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update user stats (call this after journey/item completion)
create or replace function update_user_stats(p_user_id uuid)
returns void as $$
declare
  v_completed_count integer;
  v_in_progress_count integer;
  v_total_items integer;
  v_total_hours decimal;
  v_avg_journey_rating decimal;
  v_completion_rate decimal;
begin
  -- Count completed journeys
  select count(*) into v_completed_count
  from journeys
  where user_id = p_user_id and status = 'completed';
  
  -- Count in-progress journeys
  select count(*) into v_in_progress_count
  from journeys
  where user_id = p_user_id and status = 'in_progress';
  
  -- Total items watched
  select count(*) into v_total_items
  from journey_progress
  where user_id = p_user_id and status = 'completed';
  
  -- Total hours (sum of runtime)
  select coalesce(sum(item_runtime_minutes) / 60.0, 0) into v_total_hours
  from journey_progress
  where user_id = p_user_id and status = 'completed';
  
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


-- Function to update streak (call daily when user completes an item)
create or replace function update_user_streak(p_user_id uuid)
returns void as $$
declare
  v_last_activity date;
  v_current_streak integer;
  v_longest_streak integer;
begin
  select last_activity_date, current_streak_days, longest_streak_days
  into v_last_activity, v_current_streak, v_longest_streak
  from user_stats
  where user_id = p_user_id;
  
  -- If no previous activity or first time
  if v_last_activity is null then
    update user_stats
    set current_streak_days = 1,
        longest_streak_days = 1,
        last_activity_date = current_date
    where user_id = p_user_id;
    return;
  end if;
  
  -- Check if activity is today (don't increment)
  if v_last_activity = current_date then
    return;
  end if;
  
  -- Check if activity was yesterday (increment streak)
  if v_last_activity = current_date - interval '1 day' then
    v_current_streak := v_current_streak + 1;
    v_longest_streak := greatest(v_longest_streak, v_current_streak);
    
    update user_stats
    set current_streak_days = v_current_streak,
        longest_streak_days = v_longest_streak,
        last_activity_date = current_date
    where user_id = p_user_id;
  else
    -- Streak broken, reset to 1
    update user_stats
    set current_streak_days = 1,
        last_activity_date = current_date
    where user_id = p_user_id;
  end if;
end;
$$ language plpgsql security definer;


-- Function to create activity when journey milestone reached
create or replace function create_journey_activity()
returns trigger as $$
begin
  -- Journey started
  if old.status is distinct from 'in_progress' and new.status = 'in_progress' then
    insert into activities (user_id, activity_type, journey_id, metadata)
    values (new.user_id, 'journey_started', new.id, jsonb_build_object('title', new.title));
  end if;
  
  -- Journey completed
  if old.status is distinct from 'completed' and new.status = 'completed' then
    insert into activities (user_id, activity_type, journey_id, rating, metadata)
    values (new.user_id, 'journey_completed', new.id, new.overall_rating, 
            jsonb_build_object('title', new.title, 'total_items', new.total_items));
    
    -- Update user stats
    perform update_user_stats(new.user_id);
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid errors on re-run
drop trigger if exists on_journey_status_change on journeys;
create trigger on_journey_status_change
  after update on journeys
  for each row
  when (old.status is distinct from new.status)
  execute function create_journey_activity();


-- Function to create activity when item completed
create or replace function create_item_activity()
returns trigger as $$
begin
  if old.status is distinct from 'completed' and new.status = 'completed' then
    insert into activities (user_id, activity_type, journey_id, item_title, item_position, rating, review_text)
    values (new.user_id, 'item_completed', new.journey_id, new.item_title, new.item_position, new.item_rating, new.review_text);
    
    -- Update streak
    perform update_user_streak(new.user_id);
    
    -- Update user stats
    perform update_user_stats(new.user_id);
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists
drop trigger if exists on_item_completed on journey_progress;
create trigger on_item_completed
  after update on journey_progress
  for each row
  when (old.status is distinct from new.status)
  execute function create_item_activity();
