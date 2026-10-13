import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, Profile, UserRole } from '../lib/supabase';
import { soundManager } from '../utils/audio';
import { isValidPassId } from '../utils/holder';
import { FOUNDING_PASS_ID } from '../components/UnlockedExperience';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  isVip: boolean;
  isSubscriber: boolean;
  hasVipPass: boolean;
  subscriptionStatus: string;
  hasPendingVipInvitation: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup' | 'reset' | 'update_password';
  openAuthModal: (mode?: 'signin' | 'signup' | 'reset' | 'update_password' | string) => void;
  closeAuthModal: () => void;
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

// Detect ?ref=VIP_GUEST or ?claim=vip parameters on page load and persist
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
    const p1 = sessionStorage.getItem('pending_vip_code');
    const p2 = sessionStorage.getItem(PATRON_TOKEN_KEY);
    const p3 = localStorage.getItem(PENDING_VIP_PASS_KEY);
    const p4 = localStorage.getItem(PATRON_TOKEN_KEY);
    const code = (p1 || p2 || p3 || p4 || '').trim().toUpperCase().replace(/^#/, '');
    if (!code) return null;
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
  const code = passCode || raw.vip_code_redeemed || getStoredVipPass();
  const rawSubStatus =
    raw.subscription_status ||
    (raw.role === 'ANNUAL_PASS' || raw.role === 'SUBSCRIBER' ? 'active' : 'inactive');

  let hasVip = Boolean(
    grantVipOverride ||
    raw.has_vip_pass ||
    raw.is_vip ||
    raw.role === 'VIP_GUEST' ||
    raw.role === 'CREATOR' ||
    Boolean(code)
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
    created_at: raw.created_at || new Date().toISOString(),
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
      if (p?.role) return p.role;
    }
    const savedRole = localStorage.getItem(PATRON_ROLE_KEY) || sessionStorage.getItem(PATRON_ROLE_KEY);
    if (savedRole && (savedRole === 'CREATOR' || savedRole === 'ANNUAL_PASS' || savedRole === 'VIP_GUEST')) {
      return savedRole as UserRole;
    }
    const pending = getStoredVipPass();
    if (pending) return resolveRoleForCode(pending);
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

  // Derived Dynamic Entitlements
  const isVip = Boolean(
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
  );

  const isSubscriber = Boolean(
    profile?.subscription_status === 'active' ||
    profile?.is_subscriber === true ||
    role === 'ANNUAL_PASS' ||
    role === 'SUBSCRIBER' ||
    role === 'CREATOR'
  );

  const hasVipPass = Boolean(profile?.has_vip_pass ?? isVip);
  const subscriptionStatus = profile?.subscription_status || (isSubscriber ? 'active' : 'inactive');

  // Sync profile data to Google Sheets via backend endpoint
  const syncToGoogleSheets = async (prof: Partial<Profile>, codeUsed?: string) => {
    try {
      await fetch('/api/auth/sync-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: prof.first_name,
          last_name: prof.last_name,
          email: prof.email,
          role: prof.role || 'FREE',
          has_vip_pass: prof.has_vip_pass ?? false,
          subscription_status: prof.subscription_status || 'inactive',
          vip_code_redeemed: codeUsed || prof.vip_code_redeemed || 'N/A',
          created_at: prof.created_at || new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.warn('[AuthContext] Background Google Sheets sync warning:', err);
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
        // Step 1: Guarantee immediate persistent fallback recovery
        const cachedUser = getCachedUser();
        const cachedProf = getCachedProfile();
        const cachedRole = getCachedRole();
        if (cachedProf && mounted) {
          setProfile(cachedProf);
          setRole(cachedRole);
          if (cachedUser) setUser(cachedUser);
        }

        // Step 2: Unblocked Supabase session retrieval
        if (isSupabaseConfigured) {
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

            const pendingRole = typeof window !== 'undefined' ? localStorage.getItem(PENDING_ROLE_KEY) : null;
            const hasReferralClaim = pendingRole === 'VIP_GUEST';
            const pendingPass = getStoredVipPass();

            if (profData) {
              // Preserve existing subscription status while upgrading VIP
              const currentSubStatus = profData.subscription_status || 'inactive';
              let targetRole = profData.role || 'FREE';
              let targetHasVip = Boolean(profData.has_vip_pass || hasReferralClaim);

              if (cachedProf?.role) {
                targetRole = pickHigherRole(targetRole, cachedProf.role);
              }

              // Auto-assign VIP Guest from referral link without overwriting existing subscription tier
              if (hasReferralClaim) {
                targetHasVip = true;
                if (targetRole === 'FREE' || targetRole === 'GUEST') {
                  targetRole = 'VIP_GUEST';
                }
              }

              let targetPassCode = profData.vip_code_redeemed || (hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : null) || cachedProf?.vip_code_redeemed || null;

              if (pendingPass) {
                const vipRole = resolveRoleForCode(pendingPass);
                targetRole = pickHigherRole(targetRole, vipRole);
                targetPassCode = pendingPass;
                targetHasVip = true;
              }

              const enriched = enrichProfile(
                {
                  ...profData,
                  role: targetRole,
                  has_vip_pass: targetHasVip,
                  subscription_status: currentSubStatus,
                  vip_code_redeemed: targetPassCode,
                },
                targetPassCode,
                targetHasVip
              );

              // Update in Supabase
              await persistProfileToSupabase(enriched);
              syncToGoogleSheets(enriched, targetPassCode || undefined);

              if (pendingPass && isValidPassId(pendingPass)) {
                fetch('/api/nfc/register', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token: pendingPass,
                    ownerName: enriched.full_name || `${enriched.first_name || ''} ${enriched.last_name || ''}`.trim() || enriched.email?.split('@')[0],
                    ownerEmail: enriched.email,
                  }),
                }).catch(() => {});
              }

              // Clear referral claim after successful DB update
              if (hasReferralClaim) {
                localStorage.removeItem(PENDING_ROLE_KEY);
                sessionStorage.removeItem(PENDING_ROLE_KEY);
                if (mounted) setHasPendingVipInvitation(false);
              }

              if (mounted) {
                setProfile(enriched);
                setRole(enriched.role);
                localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(enriched));
                if (enriched.vip_code_redeemed) {
                  localStorage.setItem(PATRON_TOKEN_KEY, enriched.vip_code_redeemed);
                  sessionStorage.setItem(PATRON_TOKEN_KEY, enriched.vip_code_redeemed);
                  localStorage.setItem(PATRON_ROLE_KEY, enriched.role);
                  sessionStorage.setItem(PATRON_ROLE_KEY, enriched.role);
                }
              }
            } else {
              // Profiles record not yet created: create and upsert it with referral VIP if present
              const meta = authUser.user_metadata || {};
              const first =
                meta.first_name ||
                meta.given_name ||
                meta.full_name?.split(' ')[0] ||
                meta.name?.split(' ')[0] ||
                authUser.email?.split('@')[0] ||
                'Member';
              const last =
                meta.last_name ||
                meta.family_name ||
                meta.full_name?.split(' ').slice(1).join(' ') ||
                meta.name?.split(' ').slice(1).join(' ') ||
                '';

              const initialRole: UserRole = hasReferralClaim
                ? 'VIP_GUEST'
                : pendingPass
                ? resolveRoleForCode(pendingPass)
                : cachedRole !== 'FREE'
                ? cachedRole
                : 'FREE';

              const newProf = enrichProfile(
                {
                  id: authUser.id,
                  first_name: first,
                  last_name: last,
                  email: authUser.email || '',
                  full_name: (meta.full_name || meta.name || `${first} ${last}`).trim(),
                  avatar_url: meta.avatar_url || meta.picture || null,
                  role: initialRole,
                  has_vip_pass: hasReferralClaim || Boolean(pendingPass),
                  subscription_status: 'inactive',
                  vip_code_redeemed: hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass || cachedProf?.vip_code_redeemed || null,
                },
                hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass,
                hasReferralClaim
              );

              await persistProfileToSupabase(newProf);
              syncToGoogleSheets(newProf, hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass || undefined);

              if (hasReferralClaim) {
                localStorage.removeItem(PENDING_ROLE_KEY);
                sessionStorage.removeItem(PENDING_ROLE_KEY);
                if (mounted) setHasPendingVipInvitation(false);
              }

              if (mounted) {
                setProfile(newProf);
                setRole(newProf.role);
                localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));
                if (newProf.vip_code_redeemed) {
                  localStorage.setItem(PATRON_TOKEN_KEY, newProf.vip_code_redeemed);
                  sessionStorage.setItem(PATRON_TOKEN_KEY, newProf.vip_code_redeemed);
                  localStorage.setItem(PATRON_ROLE_KEY, newProf.role);
                  sessionStorage.setItem(PATRON_ROLE_KEY, newProf.role);
                }
              }
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

          const pendingRole = typeof window !== 'undefined' ? localStorage.getItem(PENDING_ROLE_KEY) : null;
          const hasReferralClaim = pendingRole === 'VIP_GUEST';
          const pendingPass = getStoredVipPass();
          const currentCached = getCachedProfile();

          if (profData) {
            const currentSubStatus = profData.subscription_status || 'inactive';
            let targetRole = profData.role || 'FREE';
            let targetHasVip = Boolean(profData.has_vip_pass || hasReferralClaim);

            if (currentCached?.role) {
              targetRole = pickHigherRole(targetRole, currentCached.role);
            }

            if (hasReferralClaim) {
              targetHasVip = true;
              if (targetRole === 'FREE' || targetRole === 'GUEST') {
                targetRole = 'VIP_GUEST';
              }
            }

            let targetPassCode =
              profData.vip_code_redeemed ||
              (hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : null) ||
              currentCached?.vip_code_redeemed ||
              null;

            if (pendingPass) {
              const vipRole = resolveRoleForCode(pendingPass);
              targetRole = pickHigherRole(targetRole, vipRole);
              targetPassCode = pendingPass;
              targetHasVip = true;
            }

            const enriched = enrichProfile(
              {
                ...profData,
                role: targetRole,
                has_vip_pass: targetHasVip,
                subscription_status: currentSubStatus,
                vip_code_redeemed: targetPassCode,
              },
              targetPassCode,
              targetHasVip
            );

            await persistProfileToSupabase(enriched);
            syncToGoogleSheets(enriched, targetPassCode || undefined);

            if (pendingPass && isValidPassId(pendingPass)) {
              fetch('/api/nfc/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token: pendingPass,
                  ownerName: enriched.full_name || `${enriched.first_name || ''} ${enriched.last_name || ''}`.trim() || enriched.email?.split('@')[0],
                  ownerEmail: enriched.email,
                }),
              }).catch(() => {});
            }

            if (hasReferralClaim) {
              localStorage.removeItem(PENDING_ROLE_KEY);
              sessionStorage.removeItem(PENDING_ROLE_KEY);
              setHasPendingVipInvitation(false);
            }

            setProfile(enriched);
            setRole(enriched.role);
            localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(enriched));
            if (enriched.vip_code_redeemed) {
              localStorage.setItem(PATRON_TOKEN_KEY, enriched.vip_code_redeemed);
              sessionStorage.setItem(PATRON_TOKEN_KEY, enriched.vip_code_redeemed);
              localStorage.setItem(PATRON_ROLE_KEY, enriched.role);
              sessionStorage.setItem(PATRON_ROLE_KEY, enriched.role);
            }
          } else {
            const meta = authUser.user_metadata || {};
            const first =
              meta.first_name ||
              meta.given_name ||
              meta.full_name?.split(' ')[0] ||
              meta.name?.split(' ')[0] ||
              authUser.email?.split('@')[0] ||
              'Member';
            const last =
              meta.last_name ||
              meta.family_name ||
              meta.full_name?.split(' ').slice(1).join(' ') ||
              meta.name?.split(' ').slice(1).join(' ') ||
              '';

            const initialRole: UserRole = hasReferralClaim
              ? 'VIP_GUEST'
              : pendingPass
              ? resolveRoleForCode(pendingPass)
              : currentCached?.role || 'FREE';

            const newProf = enrichProfile(
              {
                id: authUser.id,
                first_name: first,
                last_name: last,
                email: authUser.email || '',
                full_name: (meta.full_name || meta.name || `${first} ${last}`).trim(),
                avatar_url: meta.avatar_url || meta.picture || null,
                role: initialRole,
                has_vip_pass: hasReferralClaim || Boolean(pendingPass),
                subscription_status: 'inactive',
                vip_code_redeemed: hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass || currentCached?.vip_code_redeemed || null,
              },
              hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass,
              hasReferralClaim
            );

            await persistProfileToSupabase(newProf);
            syncToGoogleSheets(newProf, hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass || undefined);

            if (pendingPass && isValidPassId(pendingPass)) {
              fetch('/api/nfc/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token: pendingPass,
                  ownerName: newProf.full_name || `${newProf.first_name || ''} ${newProf.last_name || ''}`.trim() || newProf.email?.split('@')[0],
                  ownerEmail: newProf.email,
                }),
              }).catch(() => {});
            }

            if (hasReferralClaim) {
              localStorage.removeItem(PENDING_ROLE_KEY);
              sessionStorage.removeItem(PENDING_ROLE_KEY);
              setHasPendingVipInvitation(false);
            }

            setProfile(newProf);
            setRole(newProf.role);
            localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));
            if (newProf.vip_code_redeemed) {
              localStorage.setItem(PATRON_TOKEN_KEY, newProf.vip_code_redeemed);
              sessionStorage.setItem(PATRON_TOKEN_KEY, newProf.vip_code_redeemed);
              localStorage.setItem(PATRON_ROLE_KEY, newProf.role);
              sessionStorage.setItem(PATRON_ROLE_KEY, newProf.role);
            }
          }

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
          const newProf = enrichProfile(
            {
              id: authUser.id,
              first_name: cleanFirst,
              last_name: cleanLast,
              email: cleanEmail,
              full_name: `${cleanFirst} ${cleanLast}`.trim(),
              role: initialRole,
              has_vip_pass: hasReferralClaim || Boolean(pendingPass),
              subscription_status: 'inactive',
              vip_code_redeemed: hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass || null,
            },
            hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass,
            hasReferralClaim
          );

          await persistProfileToSupabase(newProf);
          setProfile(newProf);
          setRole(newProf.role);
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));
          localStorage.setItem(
            LOCAL_SESSION_USER_KEY,
            JSON.stringify({ id: authUser.id, email: authUser.email })
          );

          if (hasReferralClaim) {
            localStorage.removeItem(PENDING_ROLE_KEY);
            sessionStorage.removeItem(PENDING_ROLE_KEY);
            setHasPendingVipInvitation(false);
          }

          if (newProf.vip_code_redeemed) {
            localStorage.setItem(PATRON_TOKEN_KEY, newProf.vip_code_redeemed);
            sessionStorage.setItem(PATRON_TOKEN_KEY, newProf.vip_code_redeemed);
            localStorage.setItem(PATRON_ROLE_KEY, newProf.role);
            sessionStorage.setItem(PATRON_ROLE_KEY, newProf.role);
          }

          syncToGoogleSheets(newProf, hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass || undefined);

          if (pendingPass && isValidPassId(pendingPass)) {
            fetch('/api/nfc/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: pendingPass,
                ownerName: newProf.full_name || `${newProf.first_name || ''} ${newProf.last_name || ''}`.trim() || newProf.email?.split('@')[0],
                ownerEmail: newProf.email,
              }),
            }).catch(() => {});
          }
        }
      } else {
        const simId = `usr-${Date.now()}`;
        const simUser = { id: simId, email: cleanEmail };
        const newProf = enrichProfile(
          {
            id: simId,
            first_name: cleanFirst,
            last_name: cleanLast,
            email: cleanEmail,
            full_name: `${cleanFirst} ${cleanLast}`.trim(),
            role: initialRole,
            has_vip_pass: hasReferralClaim || Boolean(pendingPass),
            subscription_status: 'inactive',
            vip_code_redeemed: hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass || null,
          },
          hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass,
          hasReferralClaim
        );

        setUser(simUser);
        setProfile(newProf);
        setRole(newProf.role);
        localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(simUser));
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));

        if (hasReferralClaim) {
          localStorage.removeItem(PENDING_ROLE_KEY);
          sessionStorage.removeItem(PENDING_ROLE_KEY);
          setHasPendingVipInvitation(false);
        }

        if (newProf.vip_code_redeemed) {
          localStorage.setItem(PATRON_TOKEN_KEY, newProf.vip_code_redeemed);
          sessionStorage.setItem(PATRON_TOKEN_KEY, newProf.vip_code_redeemed);
          localStorage.setItem(PATRON_ROLE_KEY, newProf.role);
          sessionStorage.setItem(PATRON_ROLE_KEY, newProf.role);
        }

        syncToGoogleSheets(newProf, hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass || undefined);

        if (pendingPass && isValidPassId(pendingPass)) {
          fetch('/api/nfc/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: pendingPass,
              ownerName: newProf.full_name || `${newProf.first_name || ''} ${newProf.last_name || ''}`.trim() || newProf.email?.split('@')[0],
              ownerEmail: newProf.email,
            }),
          }).catch(() => {});
        }
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
      const pendingRole = typeof window !== 'undefined' ? localStorage.getItem(PENDING_ROLE_KEY) : null;
      const hasReferralClaim = pendingRole === 'VIP_GUEST';
      const pendingPass = getStoredVipPass();

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

          const currentSubStatus = profData?.subscription_status || 'inactive';
          let targetRole = profData?.role || 'FREE';
          let targetHasVip = Boolean(profData?.has_vip_pass || hasReferralClaim);

          if (hasReferralClaim) {
            targetHasVip = true;
            if (targetRole === 'FREE' || targetRole === 'GUEST') {
              targetRole = 'VIP_GUEST';
            }
          }

          let targetPassCode =
            profData?.vip_code_redeemed ||
            (hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : null) ||
            null;

          if (pendingPass) {
            const vipRole = resolveRoleForCode(pendingPass);
            targetRole = pickHigherRole(targetRole, vipRole);
            targetPassCode = pendingPass;
            targetHasVip = true;
          }

          const resolvedProf = enrichProfile(
            profData || {
              id: authUser.id,
              email: cleanEmail,
              first_name: cleanEmail.split('@')[0],
              last_name: '',
              full_name: cleanEmail.split('@')[0],
              role: targetRole,
              has_vip_pass: targetHasVip,
              subscription_status: currentSubStatus,
            },
            targetPassCode,
            targetHasVip
          );

          await persistProfileToSupabase(resolvedProf);
          syncToGoogleSheets(resolvedProf, targetPassCode || undefined);

          if (pendingPass && isValidPassId(pendingPass)) {
            fetch('/api/nfc/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: pendingPass,
                ownerName: resolvedProf.full_name || `${resolvedProf.first_name || ''} ${resolvedProf.last_name || ''}`.trim() || resolvedProf.email?.split('@')[0],
                ownerEmail: resolvedProf.email,
              }),
            }).catch(() => {});
          }

          if (hasReferralClaim) {
            localStorage.removeItem(PENDING_ROLE_KEY);
            sessionStorage.removeItem(PENDING_ROLE_KEY);
            setHasPendingVipInvitation(false);
          }

          setProfile(resolvedProf);
          setRole(resolvedProf.role);
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(resolvedProf));
          localStorage.setItem(
            LOCAL_SESSION_USER_KEY,
            JSON.stringify({ id: authUser.id, email: authUser.email })
          );
          if (resolvedProf.vip_code_redeemed) {
            localStorage.setItem(PATRON_TOKEN_KEY, resolvedProf.vip_code_redeemed);
            sessionStorage.setItem(PATRON_TOKEN_KEY, resolvedProf.vip_code_redeemed);
            localStorage.setItem(PATRON_ROLE_KEY, resolvedProf.role);
            sessionStorage.setItem(PATRON_ROLE_KEY, resolvedProf.role);
          }
        }
      } else {
        const existingProfStr = localStorage.getItem(LOCAL_PROFILE_KEY);
        let currentProf: Profile;

        if (existingProfStr) {
          currentProf = JSON.parse(existingProfStr);
          currentProf.email = cleanEmail;
        } else {
          const derivedName = cleanEmail.split('@')[0];
          currentProf = {
            id: `usr-${Date.now()}`,
            first_name: derivedName.charAt(0).toUpperCase() + derivedName.slice(1),
            last_name: '',
            email: cleanEmail,
            full_name: derivedName,
            role: hasReferralClaim
              ? 'VIP_GUEST'
              : pendingPass
              ? resolveRoleForCode(pendingPass)
              : 'FREE',
            has_vip_pass: hasReferralClaim || Boolean(pendingPass),
            subscription_status: 'inactive',
            vip_code_redeemed: hasReferralClaim ? 'VIP-REFERRAL-CLAIM' : pendingPass || null,
            created_at: new Date().toISOString(),
          };
        }

        const enriched = enrichProfile(currentProf, pendingPass, hasReferralClaim);
        const simUser = { id: enriched.id, email: cleanEmail };
        setUser(simUser);
        setProfile(enriched);
        setRole(enriched.role);
        localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(simUser));
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(enriched));

        if (hasReferralClaim) {
          localStorage.removeItem(PENDING_ROLE_KEY);
          sessionStorage.removeItem(PENDING_ROLE_KEY);
          setHasPendingVipInvitation(false);
        }

        if (enriched.vip_code_redeemed) {
          localStorage.setItem(PATRON_TOKEN_KEY, enriched.vip_code_redeemed);
          sessionStorage.setItem(PATRON_TOKEN_KEY, enriched.vip_code_redeemed);
          localStorage.setItem(PATRON_ROLE_KEY, enriched.role);
          sessionStorage.setItem(PATRON_ROLE_KEY, enriched.role);
        }
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

    soundManager.playUnlockChime();
    const updatedProfile: Profile = enrichProfile(
      profile
        ? {
            ...profile,
            role: profile.role === 'FREE' || profile.role === 'GUEST' ? 'VIP_GUEST' : profile.role,
            has_vip_pass: true,
            vip_code_redeemed: profile.vip_code_redeemed || 'VIP-REFERRAL-CLAIM',
          }
        : {
            id: user.id,
            first_name: 'VIP',
            last_name: 'Guest',
            full_name: 'VIP Guest',
            email: user.email || 'guest@sillowmill.com',
            role: 'VIP_GUEST',
            has_vip_pass: true,
            subscription_status: 'inactive',
            vip_code_redeemed: 'VIP-REFERRAL-CLAIM',
            created_at: new Date().toISOString(),
          },
      'VIP-REFERRAL-CLAIM',
      true
    );

    setProfile(updatedProfile);
    setRole(updatedProfile.role);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updatedProfile));
    localStorage.removeItem(PENDING_ROLE_KEY);
    sessionStorage.removeItem(PENDING_ROLE_KEY);
    setHasPendingVipInvitation(false);

    if (isSupabaseConfigured && user.id) {
      await persistProfileToSupabase(updatedProfile);
    }

    syncToGoogleSheets(updatedProfile, 'VIP-REFERRAL-CLAIM');
    return { success: true, message: '✨ VIP Guest status officially activated on your account!' };
  };

  const redeemVipCode = async (
    rawCode: string
  ): Promise<{ success: boolean; message: string }> => {
    const clean = String(rawCode || '').trim().toUpperCase().replace(/^#/, '');

    if (!clean) {
      soundManager.playError();
      return { success: false, message: 'Please enter a VIP pass code.' };
    }

    const isPatronTest =
      clean === 'PATRON-TEST-ACCESS' ||
      clean === 'PATRONTESTACCESS' ||
      clean === 'PATRON' ||
      clean === 'TEST-ACCESS' ||
      clean === 'SILLOWMILL2027';

    const isMasterFounder = clean === FOUNDING_PASS_ID || clean === 'AKN-VIP-2027-X0914';
    const isValidGuestPass = isValidPassId(clean);

    if (isPatronTest || isMasterFounder || isValidGuestPass) {
      soundManager.playUnlockChime();
      const targetRole: UserRole = isMasterFounder ? 'CREATOR' : 'VIP_GUEST';

      localStorage.setItem(PATRON_TOKEN_KEY, clean);
      sessionStorage.setItem(PATRON_TOKEN_KEY, clean);
      localStorage.setItem(PATRON_ROLE_KEY, targetRole === 'CREATOR' ? 'CREATOR' : 'VIP GUEST');
      sessionStorage.setItem(PATRON_ROLE_KEY, targetRole === 'CREATOR' ? 'CREATOR' : 'VIP GUEST');
      localStorage.setItem(PENDING_VIP_PASS_KEY, clean);

      const updatedProfile: Profile = enrichProfile(
        profile
          ? {
              ...profile,
              role: pickHigherRole(profile.role, targetRole),
              has_vip_pass: true,
              vip_code_redeemed: clean,
            }
          : {
              id: user?.id || `usr-${Date.now()}`,
              first_name: 'VIP',
              last_name: 'Guest',
              full_name: 'VIP Guest',
              email: user?.email || 'guest@sillowmill.com',
              role: targetRole,
              has_vip_pass: true,
              subscription_status: 'inactive',
              vip_code_redeemed: clean,
              created_at: new Date().toISOString(),
            },
        clean,
        true
      );

      setProfile(updatedProfile);
      setRole(updatedProfile.role);
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updatedProfile));

      // Permanently link to Supabase profiles
      if (isSupabaseConfigured && user?.id) {
        await persistProfileToSupabase(updatedProfile);
      }

      // Real-time sync to Google Sheets
      syncToGoogleSheets(updatedProfile, clean);

      const msg = isMasterFounder
        ? '👑 Master Founder Pass Accepted! Creator privileges activated.'
        : `✨ VIP Guest Pass (${clean}) Activated! Full chat access unlocked across all channels.`;

      return { success: true, message: msg };
    }

    soundManager.playError();
    return {
      success: false,
      message:
        'Unrecognized pass code. Enter a valid 1-of-100 Guest Pass (AKN-VIP-2027-X001 to X100) or test passkey PATRON-TEST-ACCESS.',
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
        const enriched = enrichProfile(data);
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
        hasVipPass,
        subscriptionStatus,
        hasPendingVipInvitation,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
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
