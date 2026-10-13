-- ============================================================================
-- SILLOW MILL · ÄKINOYA ECOSYSTEM — CREATOR PORTFOLIOS & LIKES ARCHITECTURE
-- Migration: 20261013_creator_portfolios_likes.sql
-- ============================================================================

-- 1. Add Creator Portfolio fields to public.profiles
alter table public.profiles
  add column if not exists username text unique,
  add column if not exists bio text default '',
  add column if not exists social_links jsonb default '{}'::jsonb,
  add column if not exists is_artist boolean not null default false,
  add column if not exists portfolio_likes_count integer not null default 0;

-- 2. Create index for fast username lookup and artist filtering
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_is_artist on public.profiles(is_artist);

-- 3. Create public.portfolio_likes table
create table if not exists public.portfolio_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, profile_id)
);

create index if not exists idx_portfolio_likes_profile on public.portfolio_likes(profile_id);
create index if not exists idx_portfolio_likes_user on public.portfolio_likes(user_id);

-- 4. Enable RLS on portfolio_likes
alter table public.portfolio_likes enable row level security;

-- Policies for portfolio_likes
drop policy if exists "Allow everyone to read portfolio likes" on public.portfolio_likes;
create policy "Allow everyone to read portfolio likes"
  on public.portfolio_likes
  for select
  using (true);

drop policy if exists "Allow authenticated users to add likes" on public.portfolio_likes;
create policy "Allow authenticated users to add likes"
  on public.portfolio_likes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Allow users to delete their own likes" on public.portfolio_likes;
create policy "Allow users to delete their own likes"
  on public.portfolio_likes
  for delete
  using (auth.uid() = user_id);
