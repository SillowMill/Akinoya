-- ============================================================================
-- SILLOW MILL · ÄKINOYA ECOSYSTEM — FULL DATABASE RESET OF ALL 100 VIP TOKENS
-- Migration: 20261013_vip_tokens_full_reset.sql
-- ============================================================================

-- 1. Ensure public.vip_tokens table exists with full schema
create table if not exists public.vip_tokens (
  id uuid primary key default gen_random_uuid(),
  token_code text unique not null,
  is_claimed boolean not null default false,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_holder_name text,
  claimed_holder_email text,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure additional columns exist if table was already created
alter table public.vip_tokens add column if not exists claimed_holder_name text;
alter table public.vip_tokens add column if not exists claimed_holder_email text;

-- Indexes for instant lookups
create index if not exists idx_vip_tokens_code on public.vip_tokens(token_code);
create index if not exists idx_vip_tokens_claimed on public.vip_tokens(is_claimed);
create index if not exists idx_vip_tokens_claimed_by on public.vip_tokens(claimed_by_user_id);

-- Enable RLS
alter table public.vip_tokens enable row level security;

-- Policies
drop policy if exists "Allow reading vip tokens" on public.vip_tokens;
create policy "Allow reading vip tokens"
  on public.vip_tokens
  for select
  using (true);

drop policy if exists "Allow claiming vip tokens" on public.vip_tokens;
create policy "Allow claiming vip tokens"
  on public.vip_tokens
  for update
  using (
    (not is_claimed and auth.uid() is not null) or
    (claimed_by_user_id = auth.uid())
  )
  with check (
    claimed_by_user_id = auth.uid()
  );

drop policy if exists "Allow inserting vip tokens" on public.vip_tokens;
create policy "Allow inserting vip tokens"
  on public.vip_tokens
  for insert
  with check (true);

drop policy if exists "Allow service role full access on vip_tokens" on public.vip_tokens;
create policy "Allow service role full access on vip_tokens"
  on public.vip_tokens
  for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- 2. FULL DATABASE RESET: Reset all existing VIP tokens to unclaimed and clear all previous assignments
update public.vip_tokens
set
  is_claimed = false,
  claimed_by_user_id = null,
  claimed_holder_name = null,
  claimed_holder_email = null,
  claimed_at = null,
  updated_at = now();

-- 3. Upsert known VIP master pass and test tokens as unclaimed
insert into public.vip_tokens (token_code, is_claimed)
values
  ('AKN-VIP-2027-X0914', false),
  ('PATRON-TEST-ACCESS', false),
  ('SILLOWMILL2027', false)
on conflict (token_code) do update set
  is_claimed = false,
  claimed_by_user_id = null,
  claimed_holder_name = null,
  claimed_holder_email = null,
  claimed_at = null,
  updated_at = now();

-- 4. Seed and reset all 100 Guest Passes: AKN-VIP-2027-X001 through AKN-VIP-2027-X100
do $$
begin
  for i in 1..100 loop
    insert into public.vip_tokens (token_code, is_claimed)
    values (
      'AKN-VIP-2027-X' || lpad(i::text, 3, '0'),
      false
    )
    on conflict (token_code) do update set
      is_claimed = false,
      claimed_by_user_id = null,
      claimed_holder_name = null,
      claimed_holder_email = null,
      claimed_at = null,
      updated_at = now();
  end loop;
end $$;
