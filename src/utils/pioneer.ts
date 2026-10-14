/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PIONEER_LAUNCH_DATE_STR = '2027-01-09T00:00:00+01:00';
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

export const openClaimWorldModal = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('akinoya-open-claim-world'));
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
