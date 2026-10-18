/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PIONEER_LAUNCH_DATE_STR = '2027-01-09T00:00:00Z';
export const PIONEER_LAUNCH_DATE = new Date(PIONEER_LAUNCH_DATE_STR).getTime();
export const PIONEER_BADGE_TAG = '[PIONEER-2027]';

export interface CountdownTime {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  isComplete: boolean;
}

export const calculateLaunchCountdown = (): CountdownTime => {
  const diff = PIONEER_LAUNCH_DATE - Date.now();

  if (diff <= 0) {
    return {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
      isComplete: true,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    isComplete: false,
  };
};

export const isEarlyPioneerVisitor = (timestamp?: string | number): boolean => {
  const time = timestamp ? new Date(timestamp).getTime() : Date.now();
  return time < PIONEER_LAUNCH_DATE;
};

export const isPreLaunch = (): boolean => {
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('akinoya_force_post_launch') === 'true') return false;
    if (new URLSearchParams(window.location.search).get('post_launch') === 'true') return false;
  }
  return Date.now() < PIONEER_LAUNCH_DATE;
};

export const isPostLaunch = (): boolean => {
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('akinoya_force_post_launch') === 'true') return true;
    if (new URLSearchParams(window.location.search).get('post_launch') === 'true') return true;
  }
  return Date.now() >= PIONEER_LAUNCH_DATE;
};

export const hasPaidMembership = (
  user?: any,
  profile?: any,
  role?: string,
  _isVip?: boolean
): boolean => {
  const normalizedRole = (role || '').toUpperCase();
  // VIP_GUEST is strictly confined to VIP Lounge chat and does NOT grant paid membership
  if (['ANNUAL_PASS', 'SUBSCRIBER', 'CREATOR', 'ADMIN'].includes(normalizedRole)) {
    return true;
  }
  if (profile?.has_paid_membership === true || user?.has_paid_membership === true) {
    return true;
  }
  if (profile?.is_annual_member === true || profile?.is_subscriber === true) {
    return true;
  }
  if (
    profile?.membership_status === 'ACTIVE' ||
    profile?.membership_status === 'PAID' ||
    profile?.subscription_status === 'active'
  ) {
    return true;
  }
  return false;
};

export const openClaimWorldModal = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('akinoya-open-claim-world'));
  }
};

export const openMembershipGateModal = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('akinoya-open-membership-gate'));
  }
};

export interface SectorClaimRecord {
  sectorName: string;
  biome: string;
  coordinates: string;
  claimedAt: string;
  pioneerBadge: string;
  holderEmail?: string;
}

export const getStoredSectorClaim = (): SectorClaimRecord | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('sillow_claimed_sector');
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore parse error
  }
  return null;
};

export const saveSectorClaim = (record: SectorClaimRecord) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('sillow_claimed_sector', JSON.stringify(record));
    window.dispatchEvent(new CustomEvent('akinoya-sector-claimed', { detail: record }));
  } catch {
    // Ignore storage error
  }
};

export const isOdiFounderAccount = (input?: {
  email?: string | null;
  username?: string | null;
  name?: string | null;
  userId?: string | null;
} | null): boolean => {
  if (!input) return false;
  const email = (input.email || '').trim().toLowerCase();
  const username = (input.username || '').trim().toLowerCase().replace(/^@/, '');
  const name = (input.name || '').trim().toLowerCase();
  const userId = (input.userId || '').trim().toLowerCase();

  return (
    email === 'odi.selis3@gmail.com' ||
    email === 'odi@sillowmill.com' ||
    email === 'sillowmill@gmail.com' ||
    username === 'odi' ||
    username === 'odi_selis' ||
    username === 'odiselis' ||
    name === 'odi selis' ||
    name === 'odi' ||
    userId === 'user-odi-genesis'
  );
};

export const isFoundingPioneerPlanet = (planet?: {
  id?: string | null;
  planetName?: string | null;
  authorUsername?: string | null;
  authorEmail?: string | null;
  authorName?: string | null;
  userId?: string | null;
} | null): boolean => {
  if (!planet) return false;
  const id = (planet.id || '').trim().toLowerCase();
  const planetName = (planet.planetName || '').trim().toLowerCase();
  if (
    id === 'planet-amlemi-genesis-01' ||
    planetName === 'ämlemi' ||
    planetName === 'amlemi'
  ) {
    return true;
  }
  return isOdiFounderAccount({
    email: planet.authorEmail,
    username: planet.authorUsername,
    name: planet.authorName,
    userId: planet.userId,
  });
};

export const isPioneerPlanet = (planet?: {
  id?: string | null;
  planetName?: string | null;
  authorUsername?: string | null;
  authorEmail?: string | null;
  authorName?: string | null;
  userId?: string | null;
  createdAt?: string | null;
  isPioneer?: boolean | null;
} | null): boolean => {
  if (!planet) return false;
  if (planet.isPioneer === true) return true;
  if (planet.isPioneer === false) return false;
  if (isFoundingPioneerPlanet(planet)) return true;

  if (planet.createdAt) {
    const parsed = Date.parse(planet.createdAt);
    if (!Number.isNaN(parsed)) {
      return parsed < PIONEER_LAUNCH_DATE;
    }
  }
  // Pre-release worlds created prior to official launch (Jan 9, 2027)
  return isPreLaunch();
};
export const isVipAccount = (
  user?: any,
  profile?: any,
  role?: string,
  isVipProp?: boolean
): boolean => {
  if (isVipProp === true) return true;
  const normalizedRole = (role || profile?.role || '').toUpperCase();
  if (normalizedRole === 'VIP_GUEST' || normalizedRole === 'CREATOR' || normalizedRole === 'ADMIN') {
    return true;
  }
  if (profile?.is_vip === true || profile?.has_vip_pass === true) {
    return true;
  }
  if (user?.app_metadata?.is_vip === true || user?.user_metadata?.is_vip === true) {
    return true;
  }
  if (
    isOdiFounderAccount({
      email: user?.email || profile?.email,
      username: profile?.username,
      name: profile?.full_name,
      userId: user?.id || profile?.id,
    })
  ) {
    return true;
  }
  if (typeof window !== 'undefined') {
    try {
      if (
        localStorage.getItem('sillow_vip_device_access') === 'true' ||
        sessionStorage.getItem('akinoya_vip_unlocked') === 'true' ||
        Boolean(localStorage.getItem('sillow_vip_bound_token')) ||
        Boolean(sessionStorage.getItem('sillow_vip_bound_token')) ||
        localStorage.getItem('sillow_pending_role') === 'VIP_GUEST' ||
        sessionStorage.getItem('sillow_pending_role') === 'VIP_GUEST'
      ) {
        return true;
      }
    } catch {}
  }
  return false;
};

export const isVipPioneerPlanet = (planet?: {
  id?: string | null;
  planetName?: string | null;
  authorUsername?: string | null;
  authorEmail?: string | null;
  authorName?: string | null;
  userId?: string | null;
  isVipPioneer?: boolean | null;
  is_vip_pioneer?: boolean | null;
  pioneerBadge?: string | null;
  pioneer_badge?: string | null;
  createdAt?: string | null;
  isPioneer?: boolean | null;
} | null): boolean => {
  if (!planet) return false;
  // If explicitly flagged as VIP Pioneer
  if (planet.isVipPioneer === true || planet.is_vip_pioneer === true) return true;
  const badge = (planet.pioneerBadge || planet.pioneer_badge || '').toUpperCase();
  if (badge.includes('VIP PIONEER') || badge.includes('VIP')) return true;

  // If created by VIP account or founder account
  if (
    isOdiFounderAccount({
      email: planet.authorEmail,
      username: planet.authorUsername,
      name: planet.authorName,
      userId: planet.userId,
    })
  ) {
    return true;
  }

  return false;
};
