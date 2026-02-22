-- Standalone media_reviews table: allows users to review media without adding to a cravelist
create table if not exists media_reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  media_id text not null,
  media_type text not null,
  item_rating integer check (item_rating >= 1 and item_rating <= 5),
  review_text text,
  contains_spoilers boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (user_id, media_id, media_type)
);

create index if not exists media_reviews_media_idx on media_reviews (media_id, media_type);
create index if not exists media_reviews_user_idx on media_reviews (user_id);

alter table media_reviews enable row level security;

-- Anyone can read reviews (for display on media detail pages)
create policy "Media reviews are viewable by everyone" on media_reviews
  for select using (true);

-- Users can insert their own reviews
create policy "Users can insert own reviews" on media_reviews
  for insert with check ((select auth.uid()) = user_id);

-- Users can update their own reviews
create policy "Users can update own reviews" on media_reviews
  for update using ((select auth.uid()) = user_id);

-- Users can delete their own reviews
create policy "Users can delete own reviews" on media_reviews
  for delete using ((select auth.uid()) = user_id);
