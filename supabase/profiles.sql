-- Create a table for public profiles link to auth.users
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  bio text,
  favorite_genres text[],
  streaming_services text[],

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check ((select auth.uid()) = id);

create policy "Users can update own profile." on profiles
  for update using ((select auth.uid()) = id);

-- Follows Table
create table follows (
  follower_id uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  primary key (follower_id, following_id)
);

alter table follows enable row level security;

create policy "Follows are viewable by everyone" on follows
  for select using (true);

create policy "Users can follow others" on follows
  for insert with check ((select auth.uid()) = follower_id);

create policy "Users can unfollow others" on follows
  for delete using ((select auth.uid()) = follower_id);


-- Collections (Lists) Table
create table collections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  is_public boolean default true,
  created_at timestamp with time zone default now()
);

alter table collections enable row level security;

create policy "Collections are viewable by everyone if public" on collections
  for select using (is_public = true or (select auth.uid()) = user_id);

create policy "Users can create collections" on collections
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update own collections" on collections
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete own collections" on collections
  for delete using ((select auth.uid()) = user_id);


-- Collection Items Table
create table collection_items (
  id uuid default gen_random_uuid() primary key,
  collection_id uuid references collections(id) on delete cascade not null,
  media_id text not null,
  media_type text not null, -- 'movie', 'tv', 'book'
  image_url text,
  title text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

alter table collection_items enable row level security;

create policy "Collection items are viewable by everyone" on collection_items
  for select using (
    exists (
      select 1 from collections
      where collections.id = collection_items.collection_id
      and (collections.is_public = true or collections.user_id = (select auth.uid()))
    )
  );

create policy "Users can add items to own collections" on collection_items
  for insert with check (
    exists (
      select 1 from collections
      where collections.id = collection_items.collection_id
      and collections.user_id = (select auth.uid())
    )
  );

create policy "Users can remove items from own collections" on collection_items
  for delete using (
    exists (
      select 1 from collections
      where collections.id = collection_items.collection_id
      and collections.user_id = (select auth.uid())
    )
  );


-- Saved Journeys / Searches Table
create table saved_journeys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  query text not null,
  goal_amount integer,
  goal_unit text, -- 'Weeks', 'Months', 'Days'
  refinement_steps jsonb,
  results jsonb,
  created_at timestamp with time zone default now()
);

alter table saved_journeys enable row level security;

-- Only users can see their own journeys (private by default)
create policy "Users can view own journeys" on saved_journeys
  for select using ((select auth.uid()) = user_id);

create policy "Users can create journeys" on saved_journeys
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update own journeys" on saved_journeys
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete own journeys" on saved_journeys
  for delete using ((select auth.uid()) = user_id);

-- Function to handle new user creation
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, username)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'user_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
