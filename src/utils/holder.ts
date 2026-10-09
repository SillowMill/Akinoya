import { useEffect, useState } from 'react';

/**
 * Holder identity helpers.
 * The registered holder name is captured during the first-scan claim flow on /verify
 * and persisted per-device so the portal can greet the Founding Holder by name.
 */
export const HOLDER_NAME_KEY = 'akinoya_holder_name';
export const VIP_ROUTE_ACTIVE_KEY = 'akinoya_vip_route_active';
const HOLDER_EVENT = 'akinoya-holder-updated';
export const HOLDER_NAME_MAX_LENGTH = 40;
const PASS_ID_PATTERNS = [
  /^AKN-VIP-\d{4}-[A-Z]\d{4}$/, // AKN-VIP-2027-X0914
  /^AKN-\d{4}$/, // AKN-9941
  /^SM\d{3}-[A-Z0-9]{4}$/, // SM001-A9B2
];

export const isValidPassId = (raw?: string | null): boolean => {
  if (!raw || typeof raw !== 'string') return false;
  const clean = raw.trim().toUpperCase().replace(/^#/, '');
  if (clean.length > 32) return false;
  return PASS_ID_PATTERNS.some((re) => re.test(clean));
};

export const isExplicitVipRouteActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(VIP_ROUTE_ACTIVE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setExplicitVipRouteActive = (active: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    if (active) {
      sessionStorage.setItem(VIP_ROUTE_ACTIVE_KEY, 'true');
    } else {
      sessionStorage.removeItem(VIP_ROUTE_ACTIVE_KEY);
    }
  } catch {}
};

export const sanitizeHolderName = (name: string): string =>
  name.replace(/\s+/g, ' ').trim().slice(0, HOLDER_NAME_MAX_LENGTH);

export const getHolderName = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    return sanitizeHolderName(localStorage.getItem(HOLDER_NAME_KEY) || '');
  } catch {
    return '';
  }
};

export const saveHolderName = (name: string): string => {
  const clean = sanitizeHolderName(name);
  if (typeof window === 'undefined' || !clean) return clean;
  try {
    localStorage.setItem(HOLDER_NAME_KEY, clean);
    sessionStorage.setItem(HOLDER_NAME_KEY, clean);
  } catch {
    /* storage unavailable (private mode) — keep in-memory only */
  }
  window.dispatchEvent(new CustomEvent(HOLDER_EVENT, { detail: clean }));
  return clean;
};

/** Reactive hook: re-renders when the holder name changes (same tab or other tabs). */
export const useHolderName = (): string => {
  const [name, setName] = useState<string>(() => getHolderName());

  useEffect(() => {
    const sync = () => setName(getHolderName());
    window.addEventListener(HOLDER_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(HOLDER_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return name;
};
