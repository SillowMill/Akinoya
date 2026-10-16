import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, Profile, UserRole } from '../lib/supabase';
import { soundManager } from '../utils/audio';
import { isValidPassId } from '../utils/holder';
import { FOUNDING_PASS_ID } from '../components/UnlockedExperience';
import {
  checkVipTokenStatus,
  claimVipTokenForUser,
  getUserBoundVipToken,
  normalizeVipToken,
  isFounderEmail,
  ALREADY_CLAIMED_VIP_ERROR,
  OTHER_ACCOUNT_VIP_ERROR,
} from '../lib/vipTokens';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  isVip: boolean;
  isSubscriber: boolean;
  isArtist: boolean;
  hasVipPass: boolean;
  subscriptionStatus: string;
  hasPendingVipInvitation: boolean;
  vipLinkError: string | null;
  clearVipLinkError: () => void;
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup' | 'reset' | 'update_password';
  openAuthModal: (mode?: 'signin' | 'signup' | 'reset' | 'update_password' | string) => void;
  closeAuthModal: () => void;
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ data?: any; error?: any }>;
  signUpWithEmail: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  redeemVipCode: (code: string) => Promise<{ success: boolean; message: string }>;
  claimVipInvitation: () => Promise<{ success: boolean; message: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_PROFILE_KEY = 'akinoya_auth_profile';
const LOCAL_SESSION_USER_KEY = 'akinoya_session_user';
const PENDING_VIP_PASS_KEY = 'akinoya_pending_vip_pass';
const PENDING_ROLE_KEY = 'pending_role';
const PATRON_TOKEN_KEY = 'akinoya_patron_token';
const PATRON_ROLE_KEY = 'akinoya_patron_role';

const ROLE_PRIORITY: Record<UserRole, number> = {
  FREE: 0,
  GUEST: 0,
  VIP_GUEST: 1,
  SUBSCRIBER: 2,
  ANNUAL_PASS: 2,
  CREATOR: 3,
};

export const clearPendingVipStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PENDING_VIP_PASS_KEY);
    sessionStorage.removeItem('pending_vip_code');
    localStorage.removeItem(PENDING_ROLE_KEY);
    sessionStorage.removeItem(PENDING_ROLE_KEY);
    localStorage.removeItem('sillow_vip_bound_token');
    sessionStorage.removeItem('sillow_vip_bound_token');
    localStorage.removeItem('sillow_vip_device_access');
    sessionStorage.removeItem('sillow_vip_device_access');
    localStorage.removeItem('akinoya_vip_unlocked');
    sessionStorage.removeItem('akinoya_vip_unlocked');
    localStorage.removeItem(PATRON_TOKEN_KEY);
    sessionStorage.removeItem(PATRON_TOKEN_KEY);
    localStorage.removeItem(PATRON_ROLE_KEY);
    sessionStorage.removeItem(PATRON_ROLE_KEY);
  } catch {}
};

// Detect ?vip_token=..., ?ref=VIP_GUEST, ?claim=vip, /verify/:passId, or ?token=... on page load and persist
const checkAndCaptureReferral = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const ref = (searchParams.get('ref') || searchParams.get('referral') || '').trim();
    const claim = (searchParams.get('claim') || searchParams.get('tier') || '').trim();

    const isVipRef =
      ref.toUpperCase() === 'VIP_GUEST' ||
      ref.toLowerCase() === 'vip' ||
      claim.toLowerCase() === 'vip' ||
      claim.toUpperCase() === 'VIP_GUEST';

    if (isVipRef) {
      localStorage.setItem(PENDING_ROLE_KEY, 'VIP_GUEST');
      sessionStorage.setItem(PENDING_ROLE_KEY, 'VIP_GUEST');
      return true;
    }

    const pending = localStorage.getItem(PENDING_ROLE_KEY) || sessionStorage.getItem(PENDING_ROLE_KEY);
    return pending === 'VIP_GUEST';
  } catch {}
  return false;
};

const getStoredVipPass = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const p1 = sessionStorage.getItem(PATRON_TOKEN_KEY);
    const p2 = localStorage.getItem(PATRON_TOKEN_KEY);
    const p3 = localStorage.getItem('sillow_vip_bound_token');
    const p4 = sessionStorage.getItem('sillow_vip_bound_token');

    const candidates = [p1, p2, p3, p4];
    for (const c of candidates) {
      if (!c) continue;
      const code = c.trim().toUpperCase().replace(/^#/, '');
      if (
        code === 'PATRON-TEST-ACCESS' ||
        code === 'PATRONTESTACCESS' ||
        code === 'PATRON' ||
        code === 'TEST-ACCESS' ||
        code === 'SILLOWMILL2027' ||
        code === FOUNDING_PASS_ID ||
        code === 'AKN-VIP-2027-X0914' ||
        isValidPassId(code)
      ) {
        return code;
      }
    }
  } catch {}
  return null;
};

const resolveRoleForCode = (code: string): UserRole => {
  const clean = code.trim().toUpperCase().replace(/^#/, '');
  if (clean === FOUNDING_PASS_ID || clean === 'AKN-VIP-2027-X0914') {
    return 'CREATOR';
  }
  return 'VIP_GUEST';
};

const pickHigherRole = (roleA: UserRole, roleB: UserRole): UserRole => {
  return (ROLE_PRIORITY[roleA] || 0) >= (ROLE_PRIORITY[roleB] || 0) ? roleA : roleB;
};

const enrichProfile = (
  raw: Partial<Profile> & { id: string; email: string },
  passCode?: string | null,
  grantVipOverride?: boolean
): Profile => {
  const code = passCode || raw.vip_code_redeemed || null;
  const rawSubStatus =
    raw.subscription_status ||
    (raw.role === 'ANNUAL_PASS' || raw.role === 'SUBSCRIBER' ? 'active' : 'inactive');

  let hasVip = Boolean(
    grantVipOverride ||
    raw.has_vip_pass ||
    raw.is_vip ||
    raw.role === 'VIP_GUEST' ||
    raw.role === 'CREATOR' ||
    Boolean(code) ||
    (typeof window !== 'undefined' &&
      (localStorage.getItem('sillow_vip_device_access') === 'true' ||
       sessionStorage.getItem('akinoya_vip_unlocked') === 'true' ||
       Boolean(localStorage.getItem('sillow_vip_bound_token')) ||
       Boolean(sessionStorage.getItem('sillow_vip_bound_token')) ||
       localStorage.getItem(PENDING_ROLE_KEY) === 'VIP_GUEST' ||
       sessionStorage.getItem(PENDING_ROLE_KEY) === 'VIP_GUEST'))
  );

  let effectiveRole: UserRole = raw.role || 'FREE';
  if (grantVipOverride || hasVip) {
    if (effectiveRole === 'FREE' || effectiveRole === 'GUEST') {
      effectiveRole = 'VIP_GUEST';
    }
  }

  if (code) {
    const codeRole = resolveRoleForCode(code);
    effectiveRole = pickHigherRole(effectiveRole, codeRole);
    hasVip = true;
  }

  const isVip = Boolean(
    hasVip ||
    effectiveRole === 'VIP_GUEST' ||
    effectiveRole === 'CREATOR' ||
    code
  );

  const isSubscriber = Boolean(
    rawSubStatus === 'active' ||
    effectiveRole === 'ANNUAL_PASS' ||
    effectiveRole === 'SUBSCRIBER' ||
    effectiveRole === 'CREATOR'
  );

  const first =
    raw.first_name ||
    raw.full_name?.split(' ')[0] ||
    raw.email?.split('@')[0] ||
    'Member';
  const last =
    raw.last_name ||
    raw.full_name?.split(' ').slice(1).join(' ') ||
    '';
  const full = (raw.full_name || `${first} ${last}`).trim() || raw.email;

  const regDate = raw.created_at || new Date().toISOString();
  const isPioneer = new Date(regDate).getTime() < new Date('2027-01-09T00:00:00+01:00').getTime();
  const storedSector =
    typeof window !== 'undefined'
      ? (() => {
          try {
            const parsed = JSON.parse(localStorage.getItem('sillow_claimed_sector') || '');
            return parsed?.sectorName || null;
          } catch {
            return localStorage.getItem('sillow_claimed_sector') || null;
          }
        })()
      : null;
  const claimedSector = raw.claimed_sector || storedSector || null;

  return {
    id: raw.id,
    first_name: first,
    last_name: last,
    full_name: full,
    email: raw.email,
    avatar_url: raw.avatar_url || null,
    role: effectiveRole,
    has_vip_pass: hasVip,
    subscription_status: rawSubStatus,
    vip_code_redeemed: code || (hasVip ? 'VIP-REFERRAL-CLAIM' : null),
    is_vip: isVip,
    is_subscriber: isSubscriber,
    is_annual_member: isSubscriber,
    unlocked_assets: isVip || isSubscriber ? ['master_audio', 'visualizer_3d', 'lore_doc'] : [],
    is_pioneer: isPioneer,
    pioneer_badge: isPioneer ? '[PIONEER-2027]' : undefined,
    claimed_sector: claimedSector,
    created_at: regDate,
    updated_at: raw.updated_at || new Date().toISOString(),
  };
};

const persistProfileToSupabase = async (prof: Profile) => {
  if (!isSupabaseConfigured || !prof.id) return;
  try {
    const { error } = await supabase.from('profiles').upsert(
      {
        id: prof.id,
        first_name: prof.first_name,
        last_name: prof.last_name,
        full_name: prof.full_name,
        email: prof.email,
        avatar_url: prof.avatar_url || null,
        role: prof.role,
        has_vip_pass: Boolean(prof.has_vip_pass),
        subscription_status: prof.subscription_status || 'inactive',
        vip_code_redeemed: prof.vip_code_redeemed || null,
        is_pioneer: prof.is_pioneer ?? true,
        pioneer_badge: prof.pioneer_badge || '[PIONEER-2027]',
        claimed_sector: prof.claimed_sector || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('[AuthContext] Database profile upsert warning:', error.message);
    }
  } catch (err) {
    console.warn('[AuthContext] Database profile sync exception:', err);
  }
};

// Sync profile data to Google Sheets via backend endpoint (VIP GUESTS & Subscribers tabs)
const syncToGoogleSheets = async (prof: Partial<Profile>, codeUsed?: string) => {
  try {
    const cleanEmail = (prof.email || '').trim().toLowerCase();
    const isFounder = isFounderEmail(cleanEmail);
    const activeCode = codeUsed || prof.vip_code_redeemed || 'N/A';
    const founderPassStatus = isFounder
      ? 'Founder Pass (#0) - Active'
      : activeCode && activeCode !== 'N/A'
      ? `Claimed (${activeCode})`
      : prof.has_vip_pass || prof.role === 'VIP_GUEST'
      ? 'VIP Pass Active'
      : 'Standard / Unclaimed';

    await fetch('/api/sync-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: prof.created_at || new Date().toISOString(),
        first_name: prof.first_name,
        last_name: prof.last_name,
        email: prof.email,
        founderPassStatus,
        worldName: prof.claimed_sector || (isFounder ? 'Ämlemi' : 'Unclaimed'),
        role: prof.role || 'FREE',
        has_vip_pass: prof.has_vip_pass ?? false,
        subscription_status: prof.subscription_status || 'inactive',
        vip_code_redeemed: activeCode,
        created_at: prof.created_at || new Date().toISOString(),
        is_pioneer: prof.is_pioneer ?? true,
        pioneer_badge: prof.pioneer_badge || '[PIONEER-2027]',
        claimed_sector: prof.claimed_sector || undefined,
      }),
    });
  } catch (err) {
    console.warn('[AuthContext] Background Google Sheets sync warning:', err);
  }
};

// Resolve profile and validate only explicitly claimed VIP passes (strict 1-to-1 email binding)
const resolveAndLinkVipProfile = async (
  authUser: { id: string; email?: string; user_metadata?: any },
  rawProfData: Partial<Profile> | null,
  cachedProf: Profile | null,
  explicitlyClaimedCode?: string | null
): Promise<Profile> => {
  const authUserEmail = (authUser.email || rawProfData?.email || '').trim().toLowerCase();
  const isFounder = isFounderEmail(authUserEmail);

  // 1. Check if an active VIP token entry in vip_tokens is already permanently bound to this user ID / email
  const boundVipToken =
    authUser?.id || authUserEmail
      ? await getUserBoundVipToken(authUser?.id || '', authUserEmail)
      : null;

  const currentSubStatus = rawProfData?.subscription_status || 'inactive';
  let targetRole: UserRole = isFounder ? 'CREATOR' : (rawProfData?.role || 'FREE');
  let targetHasVip = Boolean(isFounder || boundVipToken);
  let targetPassCode: string | null = isFounder
    ? 'AKN-VIP-2027-X0914'
    : boundVipToken?.token_code || explicitlyClaimedCode || null;

  // Verify any previously saved vip_code_redeemed on profile against strict 1-to-1 email registry
  if (!isFounder && !boundVipToken && rawProfData?.vip_code_redeemed) {
    const check = await checkVipTokenStatus(
      rawProfData.vip_code_redeemed,
      authUser.id,
      authUserEmail
    );
    if (check.isAlreadyClaimed && check.isClaimedByMe) {
      targetHasVip = true;
      targetPassCode = rawProfData.vip_code_redeemed;
    }
  }

  if (isFounder) {
    targetRole = 'CREATOR';
    targetHasVip = true;
    targetPassCode = 'AKN-VIP-2027-X0914';
  } else if (boundVipToken || explicitlyClaimedCode || targetHasVip) {
    targetHasVip = true;
    const activeTokenCode = boundVipToken?.token_code || explicitlyClaimedCode || targetPassCode || '';
    const boundRole: UserRole = activeTokenCode === 'AKN-VIP-2027-X0914' ? 'CREATOR' : 'VIP_GUEST';
    targetRole = pickHigherRole(targetRole, boundRole);
    targetPassCode = activeTokenCode || null;
  }

  // Force standard Free user if not verified VIP, Subscriber, or Creator
  if (!isFounder && !targetHasVip && targetRole !== 'ANNUAL_PASS' && targetRole !== 'SUBSCRIBER') {
    targetRole = 'FREE';
    targetHasVip = false;
    targetPassCode = null;
  }

  const meta = authUser.user_metadata || {};
  const first =
    rawProfData?.first_name ||
    meta.first_name ||
    meta.given_name ||
    meta.full_name?.split(' ')[0] ||
    meta.name?.split(' ')[0] ||
    cachedProf?.first_name ||
    authUser.email?.split('@')[0] ||
    'Member';
  const last =
    rawProfData?.last_name ||
    meta.last_name ||
    meta.family_name ||
    meta.full_name?.split(' ').slice(1).join(' ') ||
    meta.name?.split(' ').slice(1).join(' ') ||
    cachedProf?.last_name ||
    '';
  const fullName = (
    rawProfData?.full_name ||
    meta.full_name ||
    meta.name ||
    `${first} ${last}`
  ).trim() || authUser.email;

  const baseData: Partial<Profile> & { id: string; email: string } = {
    id: authUser.id,
    first_name: first,
    last_name: last,
    full_name: fullName,
    email: authUser.email || rawProfData?.email || '',
    avatar_url: rawProfData?.avatar_url || meta.avatar_url || meta.picture || cachedProf?.avatar_url || null,
    role: targetRole,
    has_vip_pass: targetHasVip,
    subscription_status: currentSubStatus,
    vip_code_redeemed: targetPassCode,
    has_submitted_contest: rawProfData?.has_submitted_contest ?? false,
    contest_submission_id: rawProfData?.contest_submission_id ?? null,
    claimed_sector: rawProfData?.claimed_sector ?? null,
    created_at: rawProfData?.created_at || new Date().toISOString(),
  };

  const enriched = enrichProfile(baseData, targetPassCode, targetHasVip);
  enriched.has_submitted_contest = Boolean(rawProfData?.has_submitted_contest);
  enriched.contest_submission_id = rawProfData?.contest_submission_id || null;

  // Permanently upsert into Supabase public.profiles
  if (isSupabaseConfigured) {
    await persistProfileToSupabase(enriched);
  }

  // Real-time sync to Google Sheets (VIP GUESTS & Subscribers tabs)
  syncToGoogleSheets(enriched, targetPassCode || undefined);

  // Persist session tokens for automatic instant device recognition
  if (typeof window !== 'undefined') {
    if (targetHasVip) {
      localStorage.setItem('sillow_vip_device_access', 'true');
      sessionStorage.setItem('akinoya_vip_unlocked', 'true');
      localStorage.setItem(PATRON_ROLE_KEY, enriched.role);
      sessionStorage.setItem(PATRON_ROLE_KEY, enriched.role);
      if (targetPassCode) {
        localStorage.setItem(PATRON_TOKEN_KEY, targetPassCode);
        sessionStorage.setItem(PATRON_TOKEN_KEY, targetPassCode);
        localStorage.setItem('sillow_vip_bound_token', targetPassCode);
        sessionStorage.setItem('sillow_vip_bound_token', targetPassCode);
      }
    } else {
      clearPendingVipStorage();
    }
    localStorage.removeItem(PENDING_ROLE_KEY);
    sessionStorage.removeItem(PENDING_ROLE_KEY);
  }

  return enriched;
};

// Immediate Synchronous Local Fallbacks
const getCachedProfile = (): Profile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.id) return enrichProfile(parsed);
    }
  } catch {}
  return null;
};

const getCachedUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const savedUser = localStorage.getItem(LOCAL_SESSION_USER_KEY);
    if (savedUser) return JSON.parse(savedUser);
    const savedProf = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (savedProf) {
      const p = JSON.parse(savedProf);
      return { id: p.id, email: p.email, user_metadata: p };
    }
  } catch {}
  return null;
};

const getCachedRole = (): UserRole => {
  if (typeof window === 'undefined') return 'FREE';
  try {
    const savedProf = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (savedProf) {
      const p = JSON.parse(savedProf);
      if (p?.role && p.role !== 'FREE' && p.role !== 'GUEST') return p.role;
      if (p?.has_vip_pass || p?.is_vip) return 'VIP_GUEST';
    }
    const savedRole = localStorage.getItem(PATRON_ROLE_KEY) || sessionStorage.getItem(PATRON_ROLE_KEY);
    if (savedRole && (savedRole === 'CREATOR' || savedRole === 'ANNUAL_PASS' || savedRole === 'VIP_GUEST')) {
      return savedRole as UserRole;
    }
    const pending = getStoredVipPass();
    if (pending) return resolveRoleForCode(pending);
    if (
      localStorage.getItem(PENDING_ROLE_KEY) === 'VIP_GUEST' ||
      sessionStorage.getItem(PENDING_ROLE_KEY) === 'VIP_GUEST' ||
      localStorage.getItem('sillow_vip_device_access') === 'true' ||
      sessionStorage.getItem('akinoya_vip_unlocked') === 'true'
    ) {
      return 'VIP_GUEST';
    }
  } catch {}
  return 'FREE';
};

const clearAllAuthSessionStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_PROFILE_KEY);
    localStorage.removeItem(LOCAL_SESSION_USER_KEY);
    localStorage.removeItem(PATRON_TOKEN_KEY);
    localStorage.removeItem(PATRON_ROLE_KEY);
    localStorage.removeItem(PENDING_ROLE_KEY);
    localStorage.removeItem(PENDING_VIP_PASS_KEY);
    localStorage.removeItem('akinoya_public_unlocked');
    localStorage.removeItem('sillow_vip_device_access');
    localStorage.removeItem('sillow_vip_bound_token');
    localStorage.removeItem('akinoya_vip_unlocked');

    sessionStorage.removeItem(PATRON_TOKEN_KEY);
    sessionStorage.removeItem(PATRON_ROLE_KEY);
    sessionStorage.removeItem(PENDING_ROLE_KEY);
    sessionStorage.removeItem('pending_vip_code');
    sessionStorage.removeItem('akinoya_public_unlocked');
    sessionStorage.removeItem('akinoya_vip_unlocked');
    sessionStorage.removeItem('akinoya_visualizers_unlocked');
    sessionStorage.removeItem('akinoya_unlocked_tracks');
    sessionStorage.removeItem('akinoya_perk_states');
    sessionStorage.removeItem('akinoya_patron_name');
    sessionStorage.removeItem('akinoya_vip_route_active');

    // Safe redirect / reset to public root URL (/)
    if (window.location.pathname !== '/' || window.location.search) {
      window.history.replaceState({}, '', '/');
    }
    window.dispatchEvent(new CustomEvent('akinoya-auth-logout'));
  } catch (e) {
    console.warn('[AuthContext] Storage reset warning:', e);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(getCachedUser);
  const [profile, setProfile] = useState<Profile | null>(getCachedProfile);
  const [role, setRole] = useState<UserRole>(getCachedRole);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'reset' | 'update_password'>('signin');
  const [hasPendingVipInvitation, setHasPendingVipInvitation] = useState<boolean>(() => checkAndCaptureReferral());
  const [vipLinkError, setVipLinkError] = useState<string | null>(null);

  const clearVipLinkError = () => {
    setVipLinkError(null);
  };

  // Derived Dynamic Entitlements
  const isVip = Boolean(
    !vipLinkError &&
    role !== 'FREE' &&
    role !== 'GUEST' &&
    (
      profile?.has_vip_pass === true ||
      profile?.is_vip === true ||
      role === 'VIP_GUEST' ||
      role === 'CREATOR' ||
      (!user && (
        localStorage.getItem('sillow_vip_device_access') === 'true' ||
        sessionStorage.getItem('akinoya_vip_unlocked') === 'true'
      ))
    )
  );

  const isSubscriber = Boolean(
    profile?.subscription_status === 'active' ||
    profile?.is_subscriber === true ||
    role === 'ANNUAL_PASS' ||
    role === 'SUBSCRIBER' ||
    role === 'CREATOR'
  );

  const isArtist = Boolean(
    profile?.is_artist === true ||
    role === 'CREATOR' ||
    (typeof window !== 'undefined' && localStorage.getItem('akinoya_is_artist') === 'true')
  );

  const hasVipPass = Boolean(
    !vipLinkError &&
    role !== 'FREE' &&
    role !== 'GUEST' &&
    (profile?.has_vip_pass || profile?.is_vip || isVip)
  );
  const subscriptionStatus = profile?.subscription_status || (isSubscriber ? 'active' : 'inactive');

  const updateProfile = async (updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!profile && !user) return { success: false, error: 'Not authenticated' };
      const merged: Profile = {
        ...(profile || ({} as Profile)),
        ...updates,
      };
      setProfile(merged);
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(merged));
      if (updates.is_artist !== undefined) {
        localStorage.setItem('akinoya_is_artist', String(updates.is_artist));
      }

      if (isSupabaseConfigured && (profile?.id || user?.id)) {
        const targetId = profile?.id || user?.id;
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', targetId);
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[AuthContext] Profile update error:', err);
      return { success: false, error: err?.message || 'Update failed' };
    }
  };

  // Hydrate user session on mount immediately and handle VIP invitation auto-assignment
  useEffect(() => {
    let mounted = true;

    // Detect referral intent on every mount
    const isInvitePending = checkAndCaptureReferral();
    if (isInvitePending && mounted) {
      setHasPendingVipInvitation(true);
    }

    async function initAuth() {
      try {
        const searchParams =
          typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const isSupabaseAuth = Boolean(
          searchParams &&
            (searchParams.get('type') ||
              searchParams.get('token_hash') ||
              searchParams.get('code') ||
              window.location.hash.includes('access_token'))
        );

        // Pre-check candidate VIP token for single-claim enforcement (only if valid VIP pass ID, never Supabase auth token)
        const rawIncomingPass =
          searchParams && !isSupabaseAuth
            ? searchParams.get('vip_token') ||
              searchParams.get('pass') ||
              searchParams.get('nfc_token') ||
              searchParams.get('token')
            : null;
        const cleanIncomingPass = rawIncomingPass ? normalizeVipToken(rawIncomingPass) : null;
        const candidateToken =
          cleanIncomingPass && isValidPassId(cleanIncomingPass)
            ? cleanIncomingPass
            : getStoredVipPass();

        // Step 1: Guarantee immediate persistent fallback recovery
        const cachedUser = getCachedUser();
        let cachedProf = getCachedProfile();
        let cachedRole = getCachedRole();

        if (candidateToken && isValidPassId(candidateToken)) {
          const userEmail = (cachedUser?.email || cachedProf?.email || '').trim().toLowerCase();
          const tokenStatus = await checkVipTokenStatus(candidateToken, cachedUser?.id, userEmail);
          if (tokenStatus.isAlreadyClaimed) {
            if (tokenStatus.isClaimedByMe) {
              if (mounted) {
                setVipLinkError(null);
              }
            } else {
              clearPendingVipStorage();
              if (mounted) {
                setVipLinkError('Pass already claimed');
                setHasPendingVipInvitation(false);
                soundManager.playError();
              }
              if (cachedProf && !cachedProf.is_vip && cachedProf.role === 'VIP_GUEST') {
                cachedProf = { ...cachedProf, has_vip_pass: false, role: 'FREE' };
                cachedRole = 'FREE';
              }
            }
          } else if (tokenStatus.valid && tokenStatus.allowed) {
            if (mounted) {
              setVipLinkError(null);
            }
          }
        }

        if (cachedProf && mounted) {
          setProfile(cachedProf);
          setRole(cachedRole);
          if (cachedUser) setUser(cachedUser);
        }

        // Step 2: Unblocked Supabase session retrieval & OTP/Magic Link exchange
        if (isSupabaseConfigured) {
          // If returning from Email Magic Link / Signup OTP with token_hash & type
          const tokenHash = searchParams?.get('token_hash');
          const otpType = searchParams?.get('type') as any;
          if (tokenHash && otpType) {
            try {
              await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: otpType,
              });
            } catch (otpErr) {
              console.warn('[AuthContext] verifyOtp notice:', otpErr);
            }
          }

          const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
          if (!sessionErr && sessionData?.session?.user) {
            const authUser = sessionData.session.user;
            if (mounted) setUser(authUser);
            localStorage.setItem(
              LOCAL_SESSION_USER_KEY,
              JSON.stringify({
                id: authUser.id,
                email: authUser.email,
                user_metadata: authUser.user_metadata,
              })
            );

            // Fetch live profile from public.profiles table
            const { data: profData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle();

            const enriched = await resolveAndLinkVipProfile(authUser, profData, cachedProf);

            if (mounted) {
              setProfile(enriched);
              setRole(enriched.role);
              localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(enriched));
              setHasPendingVipInvitation(false);
            }
          }
        }

        // Clean redirect if landing on /auth/callback - always redirect to Welcome Page ('/')
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback')) {
          window.history.replaceState({}, '', '/');
          window.dispatchEvent(new CustomEvent('akinoya-navigate-home'));
          window.dispatchEvent(new PopStateEvent('popstate'));
        }

        // Detect incoming password recovery link
        if (
          typeof window !== 'undefined' &&
          (window.location.hash.includes('type=recovery') ||
           window.location.search.includes('type=recovery'))
        ) {
          openAuthModal('update_password');
        }
      } catch (err) {
        console.warn('[AuthContext] Auth initialization warning:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase Auth state changes & handle OAuth completion
    if (isSupabaseConfigured) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const authUser = session.user;
          setUser(authUser);
          localStorage.setItem(
            LOCAL_SESSION_USER_KEY,
            JSON.stringify({
              id: authUser.id,
              email: authUser.email,
              user_metadata: authUser.user_metadata,
            })
          );

          const { data: profData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          const currentCached = getCachedProfile();
          const enriched = await resolveAndLinkVipProfile(authUser, profData, currentCached);

          setProfile(enriched);
          setRole(enriched.role);
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(enriched));
          setHasPendingVipInvitation(false);

          // Clean redirect if landing on /auth/callback - always redirect to Welcome Page ('/')
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback')) {
            window.history.replaceState({}, '', '/');
            window.dispatchEvent(new CustomEvent('akinoya-navigate-home'));
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        } else if (event === 'PASSWORD_RECOVERY') {
          openAuthModal('update_password');
        } else if (event === 'SIGNED_OUT') {
          // Explicit sign out only
          setUser(null);
          setProfile(null);
          setRole('FREE');
          clearAllAuthSessionStorage();
        }
      });

      return () => {
        mounted = false;
        listener?.subscription?.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const openAuthModal = (mode: 'signin' | 'signup' | 'reset' | 'update_password' | string = 'signin') => {
    const safeMode =
      mode === 'signup'
        ? 'signup'
        : mode === 'reset'
        ? 'reset'
        : mode === 'update_password'
        ? 'update_password'
        : 'signin';
    setAuthModalMode(safeMode as any);
    setIsAuthModalOpen(true);
    soundManager.playTone(580, 0.05);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signInWithGoogle = async (): Promise<{ data?: any; error?: any }> => {
    soundManager.playTone(660, 0.08);

    const redirectTo =
      typeof window !== 'undefined' && window.location.origin
        ? `${window.location.origin}/`
        : 'https://www.sillowmill.com/';

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { data, error };
    }

    return {
      error: new Error(
        'Supabase Google OAuth is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
      ),
    };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }
    const hasSpecial =
      /[!@#$%^&*()_+\-=[\]{}|;:,.<>?~`'"/\\]/.test(password) || /[^A-Za-z0-9\s]/.test(password);
    if (!hasSpecial) {
      return { success: false, error: 'Password must contain at least 1 special character.' };
    }
    if (!cleanFirst) {
      return { success: false, error: 'First name is required.' };
    }

    try {
      const pendingRole = typeof window !== 'undefined' ? localStorage.getItem(PENDING_ROLE_KEY) : null;
      const hasReferralClaim = pendingRole === 'VIP_GUEST';
      const pendingPass = getStoredVipPass();
      const initialRole: UserRole = hasReferralClaim
        ? 'VIP_GUEST'
        : pendingPass
        ? resolveRoleForCode(pendingPass)
        : 'FREE';

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo:
              typeof window !== 'undefined' && window.location.origin
                ? `${window.location.origin}/`
                : 'https://www.sillowmill.com/',
            data: {
              first_name: cleanFirst,
              last_name: cleanLast,
              full_name: `${cleanFirst} ${cleanLast}`.trim(),
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data?.user) {
          const authUser = data.user;
          setUser(authUser);
          const newProf = await resolveAndLinkVipProfile(
            authUser,
            {
              id: authUser.id,
              first_name: cleanFirst,
              last_name: cleanLast,
              full_name: `${cleanFirst} ${cleanLast}`.trim(),
              email: cleanEmail,
            },
            null
          );

          setProfile(newProf);
          setRole(newProf.role);
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));
          localStorage.setItem(
            LOCAL_SESSION_USER_KEY,
            JSON.stringify({ id: authUser.id, email: authUser.email })
          );
          setHasPendingVipInvitation(false);
        }
      } else {
        const simId = `usr-${Date.now()}`;
        const simUser = { id: simId, email: cleanEmail };
        const newProf = await resolveAndLinkVipProfile(
          simUser,
          {
            id: simId,
            first_name: cleanFirst,
            last_name: cleanLast,
            full_name: `${cleanFirst} ${cleanLast}`.trim(),
            email: cleanEmail,
          },
          null
        );

        setUser(simUser);
        setProfile(newProf);
        setRole(newProf.role);
        localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(simUser));
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));
        setHasPendingVipInvitation(false);
      }

      soundManager.playUnlockChime();
      closeAuthModal();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration failed.' };
    }
  };

  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data?.user) {
          const authUser = data.user;
          setUser(authUser);

          const { data: profData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          const currentCached = getCachedProfile();
          const resolvedProf = await resolveAndLinkVipProfile(authUser, profData, currentCached);

          setProfile(resolvedProf);
          setRole(resolvedProf.role);
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(resolvedProf));
          localStorage.setItem(
            LOCAL_SESSION_USER_KEY,
            JSON.stringify({ id: authUser.id, email: authUser.email })
          );
          setHasPendingVipInvitation(false);
        }
      } else {
        const currentCached = getCachedProfile();
        const simUser = { id: currentCached?.id || `usr-${Date.now()}`, email: cleanEmail };
        const resolvedProf = await resolveAndLinkVipProfile(simUser, currentCached, currentCached);

        setUser(simUser);
        setProfile(resolvedProf);
        setRole(resolvedProf.role);
        localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(simUser));
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(resolvedProf));
        setHasPendingVipInvitation(false);
      }

      soundManager.playUnlockChime();
      closeAuthModal();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Sign in failed.' };
    }
  };

  const resetPasswordForEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (isSupabaseConfigured) {
      try {
        const redirectTo =
          typeof window !== 'undefined' && window.location.origin
            ? `${window.location.origin}/`
            : 'https://www.sillowmill.com/';
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo,
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Password reset request failed.' };
      }
    }
    return { success: false, error: 'Authentication service not configured.' };
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }
    const hasSpecial =
      /[!@#$%^&*()_+\-=[\]{}|;:,.<>?~`'"/\\]/.test(newPassword) || /[^A-Za-z0-9\s]/.test(newPassword);
    if (!hasSpecial) {
      return { success: false, error: 'Password must contain at least 1 special character.' };
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          return { success: false, error: error.message };
        }
        soundManager.playUnlockChime();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Password update failed.' };
      }
    }
    return { success: false, error: 'Authentication service not configured.' };
  };

  const signOut = async () => {
    soundManager.playTone(440, 0.08);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[AuthContext] Sign out warning:', err);
    }
    setUser(null);
    setProfile(null);
    setRole('FREE');
    clearAllAuthSessionStorage();
  };

  const claimVipInvitation = async (): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      openAuthModal('signin');
      return { success: false, message: 'Please sign in or create an account to claim your VIP invitation.' };
    }

    const pendingPass =
      getStoredVipPass() ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(PENDING_VIP_PASS_KEY) || sessionStorage.getItem('pending_vip_code')
        : null);

    const userEmail = (user.email || profile?.email || '').trim().toLowerCase();
    const holderName =
      profile?.full_name ||
      (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : '') ||
      user?.user_metadata?.full_name ||
      userEmail.split('@')[0] ||
      'Founding VIP Member';

    if (pendingPass) {
      const tokenStatus = await checkVipTokenStatus(pendingPass, user.id, userEmail);
      if (tokenStatus.isAlreadyClaimed && !tokenStatus.isClaimedByMe) {
        clearPendingVipStorage();
        setVipLinkError('Pass already claimed');
        soundManager.playError();
        return { success: false, message: 'Pass already claimed' };
      }

      const claimRes = await claimVipTokenForUser(pendingPass, user.id, holderName, userEmail);
      if (!claimRes.success) {
        clearPendingVipStorage();
        setVipLinkError('Pass already claimed');
        soundManager.playError();
        return { success: false, message: claimRes.error || 'Pass already claimed' };
      }
    }

    soundManager.playUnlockChime();
    const resolved = await resolveAndLinkVipProfile(
      user,
      profile
        ? {
            ...profile,
            has_vip_pass: true,
            role: profile.role === 'FREE' || profile.role === 'GUEST' ? 'VIP_GUEST' : profile.role,
            vip_code_redeemed: pendingPass || profile.vip_code_redeemed,
          }
        : { has_vip_pass: true, role: 'VIP_GUEST', vip_code_redeemed: pendingPass },
      profile,
      pendingPass
    );

    setProfile(resolved);
    setRole(resolved.role);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(resolved));
    setHasPendingVipInvitation(false);

    return { success: true, message: '✨ VIP Guest status officially activated on your account!' };
  };

  const redeemVipCode = async (
    rawCode: string
  ): Promise<{ success: boolean; message: string }> => {
    const clean = normalizeVipToken(rawCode);

    if (!clean) {
      soundManager.playError();
      return { success: false, message: 'Please enter a VIP pass code.' };
    }

    const userEmail = (user?.email || profile?.email || '').trim().toLowerCase();
    // Strict 1-to-1 email ownership verification
    const tokenCheck = await checkVipTokenStatus(clean, user?.id, userEmail);
    if (tokenCheck.isAlreadyClaimed) {
      if (tokenCheck.isClaimedByMe) {
        soundManager.playUnlockChime();
        return {
          success: true,
          message: 'VIP Pass already bound to your account.',
        };
      }
      soundManager.playError();
      setVipLinkError('Pass already claimed');
      return {
        success: false,
        message: 'Pass already claimed',
      };
    }

    const isMasterFounder = clean === FOUNDING_PASS_ID || clean === 'AKN-VIP-2027-X0914';
    const isValidGuestPass = isValidPassId(clean);

    if (isMasterFounder || isValidGuestPass || tokenCheck.allowed) {
      const targetUser = user || { id: profile?.id || `usr-${Date.now()}`, email: userEmail || 'guest@sillowmill.com' };
      const holderName =
        profile?.full_name ||
        (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : '') ||
        user?.user_metadata?.full_name ||
        userEmail.split('@')[0] ||
        'Founding VIP Member';

      // Permanently bind VIP pass to the claiming email/user
      const claimRes = await claimVipTokenForUser(clean, targetUser.id, holderName, userEmail);
      if (!claimRes.success) {
        soundManager.playError();
        setVipLinkError('Pass already claimed');
        return {
          success: false,
          message: claimRes.error || 'Pass already claimed',
        };
      }

      soundManager.playUnlockChime();
      const targetRole: UserRole = isMasterFounder ? 'CREATOR' : 'VIP_GUEST';

      localStorage.setItem(PATRON_TOKEN_KEY, clean);
      sessionStorage.setItem(PATRON_TOKEN_KEY, clean);
      localStorage.setItem(PATRON_ROLE_KEY, targetRole);
      sessionStorage.setItem(PATRON_ROLE_KEY, targetRole);
      localStorage.setItem(PENDING_VIP_PASS_KEY, clean);
      localStorage.setItem('sillow_vip_device_access', 'true');
      sessionStorage.setItem('akinoya_vip_unlocked', 'true');
      localStorage.setItem('sillow_vip_bound_token', clean);
      sessionStorage.setItem('sillow_vip_bound_token', clean);

      const resolved = await resolveAndLinkVipProfile(
        targetUser,
        profile
          ? { ...profile, has_vip_pass: true, role: pickHigherRole(profile.role, targetRole), vip_code_redeemed: clean }
          : { has_vip_pass: true, role: targetRole, vip_code_redeemed: clean },
        profile,
        clean
      );

      setProfile(resolved);
      setRole(resolved.role);
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(resolved));
      setHasPendingVipInvitation(false);

      const msg = isMasterFounder
        ? '👑 Master Founder Pass Accepted! Creator privileges activated.'
        : `✨ VIP Guest Pass (${clean}) Activated! Full chat access unlocked across all channels.`;

      return { success: true, message: msg };
    }

    soundManager.playError();
    return {
      success: false,
      message:
        'Unrecognized pass code. Enter a valid 1-of-100 Guest Pass (AKN-VIP-2027-X001 to X100).',
    };
  };

  const refreshProfile = async () => {
    if (!user) return;
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        const enriched = await resolveAndLinkVipProfile(user, data, profile);
        setProfile(enriched);
        setRole(enriched.role);
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(enriched));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAuthenticated: Boolean(user || profile),
        isLoading,
        isVip,
        isSubscriber,
        isArtist,
        hasVipPass,
        subscriptionStatus,
        hasPendingVipInvitation,
        vipLinkError,
        clearVipLinkError,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        updateProfile,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        resetPasswordForEmail,
        updatePassword,
        signOut,
        redeemVipCode,
        claimVipInvitation,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
