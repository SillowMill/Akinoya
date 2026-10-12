-- ============================================================================
-- SILLOW MILL · ÄKINOYA ECOSYSTEM — SUPABASE AUTH & PROFILES ARCHITECTURE
-- Migration: 20261012_init_auth_profiles.sql
-- ============================================================================

-- 1. Create Role Constraint & Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text unique not null,
  full_name text not null,
  avatar_url text,
  role text not null default 'FREE' check (role in ('FREE', 'VIP_GUEST', 'ANNUAL_PASS', 'CREATOR')),
  vip_code_redeemed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for high-performance role lookups and email queries
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policy: Users can read their own profile
create policy "Allow users to read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Policy: Allow authenticated users to view public profile info (for community chat avatars & names)
create policy "Allow community to view member basic profiles"
  on public.profiles
  for select
  using (true);

-- Policy: Users can update their own profile (name, avatar, etc.)
create policy "Allow users to update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Policy: Service role has full permissions for webhooks & backend sync
create policy "Allow service role full access"
  on public.profiles
  for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- 3. Automatic Profile Creation Trigger on Supabase Auth Signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_first text;
  v_last text;
  v_full text;
begin
  -- Extract First Name from metadata or split full_name
  v_first := coalesce(
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    nullif(trim(split_part(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), ' ', 1)), ''),
    'Explorer'
  );

  -- Extract Last Name from metadata or remaining part of full_name
  v_last := coalesce(
    nullif(trim(new.raw_user_meta_data->>'last_name'), ''),
    nullif(trim(substring(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '') from position(' ' in coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')) + 1)), ''),
    ''
  );

  v_full := trim(v_first || ' ' || v_last);
  if v_full = '' then
    v_full := coalesce(new.email, 'Community Member');
  end if;

  insert into public.profiles (
    id,
    first_name,
    last_name,
    email,
    full_name,
    avatar_url,
    role
  )
  values (
    new.id,
    v_first,
    v_last,
    new.email,
    v_full,
    new.raw_user_meta_data->>'avatar_url',
    'FREE'
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Function & Trigger to update updated_at timestamp
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
