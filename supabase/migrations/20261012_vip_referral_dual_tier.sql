-- ============================================================================
-- SILLOW MILL · ÄKINOYA ECOSYSTEM — DUAL-TIER ENTITLEMENTS & VIP REFERRALS
-- Migration: 20261012_vip_referral_dual_tier.sql
-- ============================================================================

-- 1. Add dual-tier columns to public.profiles
alter table public.profiles
  add column if not exists has_vip_pass boolean not null default false,
  add column if not exists subscription_status text not null default 'inactive';

-- 2. Update role check constraint to include GUEST and SUBSCRIBER
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('FREE', 'GUEST', 'VIP_GUEST', 'SUBSCRIBER', 'ANNUAL_PASS', 'CREATOR'));

-- 3. Create indexes for high-speed entitlement lookups
create index if not exists idx_profiles_has_vip_pass on public.profiles(has_vip_pass);
create index if not exists idx_profiles_subscription_status on public.profiles(subscription_status);
