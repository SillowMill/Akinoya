import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { soundManager } from '../utils/audio';

export interface VipToast {
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
}

export interface VipAccessContextType {
  isVipUnlocked: boolean;
  isNfcVerified: boolean;
  nfcToken: string | null;
  deviceId: string;
  toast: VipToast | null;
  unlockVip: (token?: string) => void;
  lockVip: () => void;
  dismissToast: () => void;
  triggerToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const VipAccessContext = createContext<VipAccessContextType | undefined>(undefined);

const STORAGE_KEY_ACCESS = 'sillow_vip_device_access';
const STORAGE_KEY_TOKEN = 'sillow_vip_bound_token';
const STORAGE_KEY_DEVICE = 'sillow_vip_device_id';
const COOKIE_NAME = 'sillow_vip_session';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'SSR_DEVICE';
  try {
    let id = localStorage.getItem(STORAGE_KEY_DEVICE);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'DEV-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
      localStorage.setItem(STORAGE_KEY_DEVICE, id);
    }
    return id;
  } catch {
    return 'DEV-FALLBACK-' + Date.now();
  }
}

export function hasActiveDeviceSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isExplicitRoute =
      window.location.pathname.startsWith('/verify') ||
      Boolean(new URLSearchParams(window.location.search).get('token')) ||
      Boolean(new URLSearchParams(window.location.search).get('nfc_token')) ||
      Boolean(new URLSearchParams(window.location.search).get('nfc')) ||
      Boolean(new URLSearchParams(window.location.search).get('pass')) ||
      sessionStorage.getItem('akinoya_vip_route_active') === 'true';

    // Strict security rule: direct visits never inherit VIP status automatically
    if (!isExplicitRoute) return false;

    const hasLocal = localStorage.getItem(STORAGE_KEY_ACCESS) === 'true';
    const hasCookie = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith(`${COOKIE_NAME}=true`));
    const hasSession = sessionStorage.getItem('akinoya_vip_unlocked') === 'true';
    return hasLocal || hasCookie || hasSession;
  } catch {
    return false;
  }
}

export function setDeviceSession(token?: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ACCESS, 'true');
    if (token) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    }
    document.cookie = `${COOKIE_NAME}=true; max-age=31536000; path=/; SameSite=Lax`;
    sessionStorage.setItem('akinoya_vip_unlocked', 'true');
    sessionStorage.setItem('akinoya_visualizers_unlocked', 'true');
    sessionStorage.setItem('akinoya_vip_route_active', 'true');
  } catch (err) {
    console.warn('[VIP] Could not persist device session:', err);
  }
}

export function clearDeviceSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_ACCESS);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`;
    sessionStorage.removeItem('akinoya_vip_unlocked');
    sessionStorage.removeItem('akinoya_visualizers_unlocked');
    sessionStorage.removeItem('akinoya_unlocked_tracks');
    sessionStorage.removeItem('akinoya_vip_route_active');
  } catch (err) {
    console.warn('[VIP] Could not clear device session:', err);
  }
}

export const VipAccessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isVipUnlocked, setIsVipUnlocked] = useState<boolean>(() => hasActiveDeviceSession());
  const [isNfcVerified, setIsNfcVerified] = useState<boolean>(false);
  const [nfcToken, setNfcToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_TOKEN);
    }
    return null;
  });
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const [toast, setToast] = useState<VipToast | null>(null);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const triggerToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, type, timestamp: Date.now() });
    },
    []
  );

  // Listen for NFC magic link token query parameter on page load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hadExistingAccess = hasActiveDeviceSession();
    const searchParams = new URLSearchParams(window.location.search);
    const rawToken =
      searchParams.get('token') ||
      searchParams.get('nfc_token') ||
      searchParams.get('nfc') ||
      searchParams.get('pass');

    const isVerifyRoute = window.location.pathname.startsWith('/verify');
    const hasEnc = Boolean(searchParams.get('enc'));

    if (rawToken && rawToken.trim() && !isVerifyRoute && !hasEnc) {
      const cleanToken = rawToken.trim().toUpperCase().replace(/^#/, '');
      try {
        window.location.replace(`/verify/${cleanToken}`);
      } catch {
        window.location.href = `/verify/${cleanToken}`;
      }
      return;
    } else {
      // Direct visits or non-token page loads
      if (hadExistingAccess) {
        setIsVipUnlocked(true);
      } else {
        setIsVipUnlocked(false);
      }
    }
  }, [triggerToast]);

  const unlockVip = useCallback((token?: string) => {
    setDeviceSession(token);
    setIsVipUnlocked(true);
    if (token) setNfcToken(token);
  }, []);

  const lockVip = useCallback(() => {
    clearDeviceSession();
    setIsVipUnlocked(false);
    setIsNfcVerified(false);
    setNfcToken(null);
  }, []);

  return (
    <VipAccessContext.Provider
      value={{
        isVipUnlocked,
        isNfcVerified,
        nfcToken,
        deviceId,
        toast,
        unlockVip,
        lockVip,
        dismissToast,
        triggerToast,
      }}
    >
      {children}
    </VipAccessContext.Provider>
  );
};

export const useVipAccess = (): VipAccessContextType => {
  const context = useContext(VipAccessContext);
  if (!context) {
    throw new Error('useVipAccess must be used within a VipAccessProvider');
  }
  return context;
};
