-- ============================================
-- EPISODE PROGRESS: Per-user watch status for TV episodes
-- ============================================

create table if not exists episode_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  media_id text not null,  -- TMDB show ID
  season_number integer not null,
  episode_number integer not null,
  status text default 'watched' not null,  -- 'watched' | 'not_seen'
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  unique(user_id, media_id, season_number, episode_number)
);

alter table episode_progress enable row level security;

create policy "Users can view own episode progress" on episode_progress
  for select using (user_id = (select auth.uid()));

create policy "Users can insert own episode progress" on episode_progress
  for insert with check (user_id = (select auth.uid()));

create policy "Users can update own episode progress" on episode_progress
  for update using (user_id = (select auth.uid()));

create policy "Users can delete own episode progress" on episode_progress
  for delete using (user_id = (select auth.uid()));

create index episode_progress_user_media_idx on episode_progress(user_id, media_id);
