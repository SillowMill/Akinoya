-- ============================================================================
-- SILLOW MILL · ÄKINOYA ECOSYSTEM — OFFICIAL LAUNCH MASTER DATABASE RESET
-- Migration: 20261014_official_launch_master_reset.sql
-- ============================================================================

-- 1. Ensure public.vip_tokens table exists with complete schema
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

-- Ensure auxiliary columns exist
alter table public.vip_tokens add column if not exists claimed_holder_name text;
alter table public.vip_tokens add column if not exists claimed_holder_email text;

-- Indexes for lightning-fast queries
create index if not exists idx_vip_tokens_code on public.vip_tokens(token_code);
create index if not exists idx_vip_tokens_claimed on public.vip_tokens(is_claimed);
create index if not exists idx_vip_tokens_claimed_by on public.vip_tokens(claimed_by_user_id);

-- Enable RLS
alter table public.vip_tokens enable row level security;

-- Policies for public.vip_tokens
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

-- 2. RESET ALL VIP TOKENS: Clear all existing claims and bindings
update public.vip_tokens
set
  is_claimed = false,
  claimed_by_user_id = null,
  claimed_holder_name = null,
  claimed_holder_email = null,
  claimed_at = null,
  updated_at = now();

-- 3. Upsert Master Founders Pass (#0 / AKN-VIP-2027-X0914) as UNCLAIMED
-- Ready for official dynamic first-claim by Odi Selis
insert into public.vip_tokens (token_code, is_claimed)
values
  ('AKN-VIP-2027-X0914', false)
on conflict (token_code) do update set
  is_claimed = false,
  claimed_by_user_id = null,
  claimed_holder_name = null,
  claimed_holder_email = null,
  claimed_at = null,
  updated_at = now();

-- Test Patron tokens
insert into public.vip_tokens (token_code, is_claimed)
values
  ('PATRON-TEST-ACCESS', false),
  ('SILLOWMILL2027', false)
on conflict (token_code) do update set
  is_claimed = false,
  claimed_by_user_id = null,
  claimed_holder_name = null,
  claimed_holder_email = null,
  claimed_at = null,
  updated_at = now();

-- 4. Seed and reset all 100 Edition Passes: AKN-VIP-2027-X001 through AKN-VIP-2027-X100
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

-- 5. RESET PROFILE VIP BINDINGS
-- Clear redeemed pass bindings from all user accounts so everyone starts fresh
update public.profiles
set
  vip_code_redeemed = null,
  has_vip_pass = false,
  is_vip = false,
  updated_at = now()
where role != 'CREATOR';

-- For Creator (Odi), reset vip_code_redeemed so Founder Pass (#0) can be claimed fresh
update public.profiles
set
  vip_code_redeemed = null,
  updated_at = now()
where role = 'CREATOR';
