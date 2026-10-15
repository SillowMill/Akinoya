/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hasPaidMembership } from './pioneer';

export type UserStatusTier = 'VISITOR' | 'FREE' | 'CREW' | 'VIP';

export interface UserStatusPillConfig {
  tier: UserStatusTier;
  pillLabel: 'PUBLIC GUEST' | 'ACCOUNT HOLDER' | 'CREW MEMBER' | 'VIP';
  indicatorLabel: 'PUBLIC ACCESS' | 'ACCESS GRANTED';
  pillClassName: string;
  indicatorClassName: string;
  dotColorClassName: string;
}

export function getUserStatusConfig(
  isAuthenticated: boolean,
  user?: any,
  profile?: any,
  role?: string,
  isVip?: boolean
): UserStatusPillConfig {
  const isActuallyAuthenticated = Boolean(isAuthenticated && (user || profile));

  const effectiveIsVip = Boolean(
    isActuallyAuthenticated &&
    (
      isVip ||
      profile?.has_vip_pass === true ||
      profile?.is_vip === true ||
      role === 'VIP_GUEST' ||
      role === 'CREATOR' ||
      Boolean(profile?.vip_code_redeemed) ||
      (typeof window !== 'undefined' &&
        (Boolean(localStorage.getItem('akinoya_patron_token')) ||
         Boolean(sessionStorage.getItem('akinoya_patron_token')) ||
         Boolean(localStorage.getItem('sillow_vip_device_access') === 'true') ||
         Boolean(sessionStorage.getItem('akinoya_vip_unlocked') === 'true') ||
         Boolean(localStorage.getItem('sillow_vip_bound_token')) ||
         localStorage.getItem('akinoya_patron_role') === 'CREATOR' ||
         localStorage.getItem('akinoya_patron_role') === 'VIP_GUEST'))
    )
  );

  const effectiveIsCrew = Boolean(
    isActuallyAuthenticated &&
    !effectiveIsVip &&
    (
      hasPaidMembership(user, profile, role) ||
      role === 'ANNUAL_PASS' ||
      role === 'SUBSCRIBER' ||
      profile?.is_annual_member === true ||
      profile?.is_subscriber === true ||
      profile?.subscription_status === 'active' ||
      (typeof window !== 'undefined' &&
        (localStorage.getItem('akinoya_patron_role') === 'ANNUAL_PASS' ||
         localStorage.getItem('akinoya_patron_role') === 'SUBSCRIBER'))
    )
  );

  const effectiveIsAccount = Boolean(
    isActuallyAuthenticated && !effectiveIsVip && !effectiveIsCrew
  );

  // 1. VIP Pass Holder (Luxe Amber/Gold #f59e0b)
  if (effectiveIsVip) {
    return {
      tier: 'VIP',
      pillLabel: 'VIP',
      indicatorLabel: 'ACCESS GRANTED',
      pillClassName:
        'bg-amber-950/80 border border-amber-400/60 text-amber-300 font-mono font-bold shadow-[0_0_12px_rgba(245,158,11,0.35)]',
      indicatorClassName:
        'bg-amber-950/60 border border-amber-400/30 text-amber-300 font-mono shadow-[0_0_8px_rgba(245,158,11,0.2)]',
      dotColorClassName: 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.9)] animate-pulse',
    };
  }

  // 2. Paid Annual Member (Neon Emerald Green #10b981)
  if (effectiveIsCrew) {
    return {
      tier: 'CREW',
      pillLabel: 'CREW MEMBER',
      indicatorLabel: 'ACCESS GRANTED',
      pillClassName:
        'bg-emerald-950/80 border border-[#10b981]/70 text-[#10b981] font-mono font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)]',
      indicatorClassName:
        'bg-emerald-950/60 border border-[#10b981]/40 text-emerald-300 font-mono shadow-[0_0_8px_rgba(16,185,129,0.2)]',
      dotColorClassName: 'bg-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.9)] animate-pulse',
    };
  }

  // 3. Free Account Holder (Cyan/blue glassmorphism)
  if (effectiveIsAccount) {
    return {
      tier: 'FREE',
      pillLabel: 'ACCOUNT HOLDER',
      indicatorLabel: 'ACCESS GRANTED',
      pillClassName:
        'bg-cyan-950/70 backdrop-blur-md border border-cyan-400/40 text-cyan-300 font-mono font-bold shadow-[0_0_10px_rgba(0,242,254,0.2)]',
      indicatorClassName:
        'bg-cyan-950/60 border border-cyan-400/30 text-cyan-300 font-mono shadow-[0_0_8px_rgba(0,242,254,0.15)]',
      dotColorClassName: 'bg-cyan-400 shadow-[0_0_6px_rgba(0,242,254,0.8)]',
    };
  }

  // 4. Visitor / Non-Logged In (Muted cyan)
  return {
    tier: 'VISITOR',
    pillLabel: 'PUBLIC GUEST',
    indicatorLabel: 'PUBLIC ACCESS',
    pillClassName:
      'bg-cyan-950/40 border border-cyan-500/25 text-cyan-300/80 font-mono font-medium',
    indicatorClassName:
      'bg-cyan-950/40 border border-cyan-500/25 text-cyan-300/70 font-mono',
    dotColorClassName: 'bg-cyan-400/70',
  };
}
