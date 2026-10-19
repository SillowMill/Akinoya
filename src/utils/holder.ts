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
export const TOTAL_EDITION_LIMIT = 100;
const PASS_ID_PATTERNS = [
  /^AKN-VIP-\d{4}-[A-Z]\d{3,4}$/, // AKN-VIP-2027-X0914, AKN-VIP-2027-X001..X100
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

/**
 * Rigorously formats user/author names in Title Case (e.g. "Odi Selis"),
 * stripping out any legacy technical suffixes (such as "(Master)", "- #1 Showcase",
 * trailing digits like "odi.selis3", "#01", email domains, underscores, etc.).
 */
export const formatTitleCaseUserName = (rawName?: string | null): string => {
  if (!rawName) return 'Odi Selis';

  // 1. If it's an email, extract local part
  let clean = rawName.includes('@') ? rawName.split('@')[0] : rawName;

  // 2. Normalize primary founder variations immediately to pure "Odi Selis"
  if (/^(?:odi[\._\s-]?selis\d*|odiselis\d*)$/i.test(clean.trim())) {
    return 'Odi Selis';
  }

  // 3. Strip legacy technical parentheticals, suffixes, badges & showcase tags
  clean = clean.replace(/\s*[\(\[\{]?(?:master|founder|pioneer|showcase|vip|member|admin|benchmark|genesis)[\)\]\}]?/gi, '');
  clean = clean.replace(/\s*[-–—#].*$/i, ''); // Strip trailing " - #1 Showcase" or " #1"
  clean = clean.replace(/\s*#\d+/g, '');
  clean = clean.replace(/([a-zA-Z]+)[\._\-]?\d+$/g, '$1'); // Strip trailing digits attached to words: user123 -> user
  clean = clean.replace(/[\._\-]+/g, ' '); // Replace separators with clean spaces

  // 4. Split into clean words and format in strict Title Case
  const words = clean.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Odi Selis';

  const titleCased = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return titleCased || 'Odi Selis';
};

export const getHolderName = (passId?: string): string => {
  if (typeof window === 'undefined') return '';
  const cleanId = (passId || '').trim().toUpperCase().replace(/^#/, '');
  try {
    if (cleanId) {
      const perPass = localStorage.getItem(`akinoya_holder_name_${cleanId}`);
      if (perPass) return sanitizeHolderName(perPass);
      return '';
    }
    return sanitizeHolderName(localStorage.getItem(HOLDER_NAME_KEY) || '');
  } catch {
    return '';
  }
};

export const saveHolderName = (name: string, passId?: string): string => {
  const clean = sanitizeHolderName(name);
  if (typeof window === 'undefined' || !clean) return clean;
  const cleanId = (passId || '').trim().toUpperCase().replace(/^#/, '');
  try {
    if (cleanId) {
      localStorage.setItem(`akinoya_holder_name_${cleanId}`, clean);
      sessionStorage.setItem(`akinoya_holder_name_${cleanId}`, clean);
    }
    localStorage.setItem(HOLDER_NAME_KEY, clean);
    sessionStorage.setItem(HOLDER_NAME_KEY, clean);
  } catch {
    /* storage unavailable (private mode) — keep in-memory only */
  }
  window.dispatchEvent(new CustomEvent(HOLDER_EVENT, { detail: clean }));
  return clean;
};

/** Reactive hook: re-renders when the holder name changes (same tab or other tabs). */
export const useHolderName = (passId?: string): string => {
  const [name, setName] = useState<string>(() => getHolderName(passId));

  useEffect(() => {
    const sync = () => setName(getHolderName(passId));
    sync();
    window.addEventListener(HOLDER_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(HOLDER_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [passId]);

  return name;
};

export const clearHolderName = (passId?: string): void => {
  if (typeof window === 'undefined') return;
  const cleanId = (passId || '').trim().toUpperCase().replace(/^#/, '');
  try {
    if (cleanId) {
      localStorage.removeItem(`akinoya_holder_name_${cleanId}`);
      sessionStorage.removeItem(`akinoya_holder_name_${cleanId}`);
      localStorage.removeItem(`akinoya_holder_name_#${cleanId}`);
      sessionStorage.removeItem(`akinoya_holder_name_#${cleanId}`);
    }
    localStorage.removeItem(HOLDER_NAME_KEY);
    sessionStorage.removeItem(HOLDER_NAME_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent(HOLDER_EVENT, { detail: '' }));
};
