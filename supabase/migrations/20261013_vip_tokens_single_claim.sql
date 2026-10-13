-- ============================================================================
-- SILLOW MILL · ÄKINOYA ECOSYSTEM — ONE-TIME USE VIP TOKENS ARCHITECTURE
-- Migration: 20261013_vip_tokens_single_claim.sql
-- ============================================================================

-- 1. Create public.vip_tokens table for strict single-claim binding
create table if not exists public.vip_tokens (
  id uuid primary key default gen_random_uuid(),
  token_code text unique not null,
  is_claimed boolean not null default false,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for instant lookups
create index if not exists idx_vip_tokens_code on public.vip_tokens(token_code);
create index if not exists idx_vip_tokens_claimed on public.vip_tokens(is_claimed);
create index if not exists idx_vip_tokens_claimed_by on public.vip_tokens(claimed_by_user_id);

-- 3. Row Level Security (RLS)
alter table public.vip_tokens enable row level security;

-- Policy: Allow reading tokens (to check claim status)
drop policy if exists "Allow reading vip tokens" on public.vip_tokens;
create policy "Allow reading vip tokens"
  on public.vip_tokens
  for select
  using (true);

-- Policy: Allow authenticated users to claim an unclaimed token
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

-- Policy: Allow service role full access
drop policy if exists "Allow service role full access on vip_tokens" on public.vip_tokens;
create policy "Allow service role full access on vip_tokens"
  on public.vip_tokens
  for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- 4. Pre-populate known VIP master pass and test tokens as unclaimed
insert into public.vip_tokens (token_code, is_claimed)
values
  ('AKN-VIP-2027-X0914', false),
  ('PATRON-TEST-ACCESS', false),
  ('SILLOWMILL2027', false)
on conflict (token_code) do nothing;

-- Pre-populate the 100 Guest Passes: AKN-VIP-2027-X001 to AKN-VIP-2027-X100
do $$
begin
  for i in 1..100 loop
    insert into public.vip_tokens (token_code, is_claimed)
    values (
      'AKN-VIP-2027-X' || lpad(i::text, 3, '0'),
      false
    )
    on conflict (token_code) do nothing;
  end loop;
end $$;
