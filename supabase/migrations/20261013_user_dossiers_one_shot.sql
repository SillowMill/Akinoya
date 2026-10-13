-- ============================================================================
-- Migration: 20261013_user_dossiers_one_shot.sql
-- Enforces Strict One-Shot Submission Rule & Realtime Community Voting
-- ============================================================================

-- 1. Create user_dossiers table with UNIQUE constraint on user_id
create table if not exists public.user_dossiers (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  author_name text not null,
  author_username text,
  author_email text,
  author_avatar_gradient text default 'from-amber-400 via-yellow-500 to-amber-700',
  planet_name text not null,
  atmosphere text,
  flora text,
  fauna text,
  sonic_vibe text,
  visual_aesthetic text,
  landmark text,
  additional_notes text,
  human_answers jsonb default '{}'::jsonb,
  generated_lore text,
  renders jsonb not null default '{}'::jsonb,
  votes_count integer default 1,
  status text default 'SUBMITTED',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast user lookup and voting leaderboard sorting
create index if not exists idx_user_dossiers_user_id on public.user_dossiers(user_id);
create index if not exists idx_user_dossiers_votes on public.user_dossiers(votes_count desc);

-- 2. Enable Row Level Security (RLS)
alter table public.user_dossiers enable row level security;

-- Drop existing policies if any
drop policy if exists "Anyone can read user_dossiers" on public.user_dossiers;
drop policy if exists "Authenticated users can insert one dossier" on public.user_dossiers;
drop policy if exists "Authenticated users can update their dossier" on public.user_dossiers;

-- Read policy: Anyone (public or authenticated) can view all submitted dossiers
create policy "Anyone can read user_dossiers"
  on public.user_dossiers
  for select
  using (true);

-- Insert policy: Authenticated users can insert ONLY their single dossier
create policy "Authenticated users can insert one dossier"
  on public.user_dossiers
  for insert
  with check (auth.uid() = user_id);

-- Update policy: User can update their own dossier, or update votes
create policy "Authenticated users can update their dossier"
  on public.user_dossiers
  for update
  using (true);

-- 3. Community Votes Table for Realtime Voting
create table if not exists public.dossier_votes (
  id uuid primary key default gen_random_uuid(),
  dossier_id text references public.user_dossiers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(dossier_id, user_id)
);

alter table public.dossier_votes enable row level security;

drop policy if exists "Anyone can read dossier_votes" on public.dossier_votes;
drop policy if exists "Authenticated users can vote on dossiers" on public.dossier_votes;
drop policy if exists "Authenticated users can remove vote" on public.dossier_votes;

create policy "Anyone can read dossier_votes"
  on public.dossier_votes
  for select
  using (true);

create policy "Authenticated users can vote on dossiers"
  on public.dossier_votes
  for insert
  with check (auth.uid() = user_id);

create policy "Authenticated users can remove vote"
  on public.dossier_votes
  for delete
  using (auth.uid() = user_id);

-- 4. Enable Supabase Realtime for user_dossiers and dossier_votes
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'user_dossiers'
  ) then
    alter publication supabase_realtime add table public.user_dossiers;
  end if;
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'dossier_votes'
  ) then
    alter publication supabase_realtime add table public.dossier_votes;
  end if;
end $$;
