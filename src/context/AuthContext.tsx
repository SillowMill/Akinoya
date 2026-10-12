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
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup';
  openAuthModal: (mode?: 'signin' | 'signup' | string) => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<{ data?: any; error?: any }>;
  signUpWithEmail: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  redeemVipCode: (code: string) => Promise<{ success: boolean; message: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_PROFILE_KEY = 'akinoya_auth_profile';
const LOCAL_SESSION_USER_KEY = 'akinoya_session_user';
const PENDING_VIP_PASS_KEY = 'akinoya_pending_vip_pass';
const PATRON_TOKEN_KEY = 'akinoya_patron_token';
const PATRON_ROLE_KEY = 'akinoya_patron_role';

const ROLE_PRIORITY: Record<UserRole, number> = {
  FREE: 0,
  VIP_GUEST: 1,
  ANNUAL_PASS: 2,
  CREATOR: 3,
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
  passCode?: string | null
): Profile => {
  const code = passCode || raw.vip_code_redeemed || getStoredVipPass();
  let effectiveRole: UserRole = raw.role || 'FREE';
  if (code) {
    const codeRole = resolveRoleForCode(code);
    effectiveRole = pickHigherRole(effectiveRole, codeRole);
  }

  const isVip = effectiveRole === 'VIP_GUEST' || effectiveRole === 'CREATOR' || Boolean(code);
  const isAnnual = effectiveRole === 'ANNUAL_PASS' || effectiveRole === 'CREATOR';
  const first = raw.first_name || raw.full_name?.split(' ')[0] || raw.email?.split('@')[0] || 'Member';
  const last = raw.last_name || raw.full_name?.split(' ').slice(1).join(' ') || '';
  const full = (raw.full_name || `${first} ${last}`).trim() || raw.email;

  return {
    id: raw.id,
    first_name: first,
    last_name: last,
    full_name: full,
    email: raw.email,
    avatar_url: raw.avatar_url || null,
    role: effectiveRole,
    vip_code_redeemed: code || null,
    is_vip: isVip,
    is_annual_member: isAnnual,
    unlocked_assets: isVip || isAnnual ? ['master_audio', 'visualizer_3d', 'lore_doc'] : [],
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_PROFILE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [role, setRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_PROFILE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.role) return parsed.role;
        }
      } catch {}
    }
    return 'FREE';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

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
          vip_code_redeemed: codeUsed || prof.vip_code_redeemed || 'N/A',
          created_at: prof.created_at || new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.warn('[AuthContext] Background Google Sheets sync warning:', err);
    }
  };

  // Hydrate user session on mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.getSession();
          if (!error && data?.session?.user) {
            const authUser = data.session.user;
            if (mounted) setUser(authUser);

            // Fetch live profile from Supabase profiles table
            const { data: profData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle();

            const pendingPass = getStoredVipPass();

            if (profData) {
              let targetRole = profData.role || 'FREE';
              let targetPassCode = profData.vip_code_redeemed || null;

              // Upgrade if user holds a valid VIP pass and was not yet upgraded
              if (pendingPass && (targetRole === 'FREE' || !targetPassCode)) {
                const vipRole = resolveRoleForCode(pendingPass);
                targetRole = pickHigherRole(targetRole, vipRole);
                targetPassCode = pendingPass;
              }

              const enriched = enrichProfile({
                ...profData,
                role: targetRole,
                vip_code_redeemed: targetPassCode,
              });

              // Persist upgrades back to DB
              if (targetRole !== profData.role || targetPassCode !== profData.vip_code_redeemed) {
                await persistProfileToSupabase(enriched);
                syncToGoogleSheets(enriched, targetPassCode || undefined);
              }

              if (mounted) {
                setProfile(enriched);
                setRole(enriched.role);
                localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(enriched));
                localStorage.setItem(
                  LOCAL_SESSION_USER_KEY,
                  JSON.stringify({ id: authUser.id, email: authUser.email })
                );
                if (enriched.vip_code_redeemed) {
                  sessionStorage.setItem(PATRON_TOKEN_KEY, enriched.vip_code_redeemed);
                  sessionStorage.setItem(PATRON_ROLE_KEY, enriched.role);
                }
              }
            } else {
              // Extract from Supabase user_metadata if profiles record not yet created
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
              const initialRole = pendingPass ? resolveRoleForCode(pendingPass) : 'FREE';

              const newProf = enrichProfile({
                id: authUser.id,
                first_name: first,
                last_name: last,
                email: authUser.email || '',
                full_name: (meta.full_name || meta.name || `${first} ${last}`).trim(),
                avatar_url: meta.avatar_url || meta.picture || null,
                role: initialRole,
                vip_code_redeemed: pendingPass || null,
              });

              await persistProfileToSupabase(newProf);
              syncToGoogleSheets(newProf, pendingPass || undefined);

              if (mounted) {
                setProfile(newProf);
                setRole(newProf.role);
                localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));
                localStorage.setItem(
                  LOCAL_SESSION_USER_KEY,
                  JSON.stringify({ id: authUser.id, email: authUser.email })
                );
                if (newProf.vip_code_redeemed) {
                  sessionStorage.setItem(PATRON_TOKEN_KEY, newProf.vip_code_redeemed);
                  sessionStorage.setItem(PATRON_ROLE_KEY, newProf.role);
                }
              }
            }
          }
        } else {
          // Local storage session fallback
          const savedProfStr = localStorage.getItem(LOCAL_PROFILE_KEY);
          const savedUserStr = localStorage.getItem(LOCAL_SESSION_USER_KEY);
          if (savedProfStr && mounted) {
            try {
              const parsed = JSON.parse(savedProfStr);
              setProfile(parsed);
              setRole(parsed.role || 'FREE');
              if (savedUserStr) {
                setUser(JSON.parse(savedUserStr));
              } else {
                setUser({ id: parsed.id, email: parsed.email });
              }
            } catch {}
          }
        }

        // Clean redirect if landing on /auth/callback
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback')) {
          window.history.replaceState({}, '', '/community');
        }
      } catch (err) {
        console.warn('[AuthContext] Auth initialization warning:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase Auth state changes
    if (isSupabaseConfigured) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const authUser = session.user;
          setUser(authUser);

          const { data: profData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          const pendingPass = getStoredVipPass();

          if (profData) {
            let targetRole = profData.role || 'FREE';
            let targetPassCode = profData.vip_code_redeemed || null;

            if (pendingPass && (targetRole === 'FREE' || !targetPassCode)) {
              const vipRole = resolveRoleForCode(pendingPass);
              targetRole = pickHigherRole(targetRole, vipRole);
              targetPassCode = pendingPass;
            }

            const enriched = enrichProfile({
              ...profData,
              role: targetRole,
              vip_code_redeemed: targetPassCode,
            });

            if (targetRole !== profData.role || targetPassCode !== profData.vip_code_redeemed) {
              await persistProfileToSupabase(enriched);
              syncToGoogleSheets(enriched, targetPassCode || undefined);
            }

            setProfile(enriched);
            setRole(enriched.role);
            localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(enriched));
            localStorage.setItem(
              LOCAL_SESSION_USER_KEY,
              JSON.stringify({ id: authUser.id, email: authUser.email })
            );
            if (enriched.vip_code_redeemed) {
              sessionStorage.setItem(PATRON_TOKEN_KEY, enriched.vip_code_redeemed);
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
            const initialRole = pendingPass ? resolveRoleForCode(pendingPass) : 'FREE';

            const newProf = enrichProfile({
              id: authUser.id,
              first_name: first,
              last_name: last,
              email: authUser.email || '',
              full_name: (meta.full_name || meta.name || `${first} ${last}`).trim(),
              avatar_url: meta.avatar_url || meta.picture || null,
              role: initialRole,
              vip_code_redeemed: pendingPass || null,
            });

            await persistProfileToSupabase(newProf);
            syncToGoogleSheets(newProf, pendingPass || undefined);

            setProfile(newProf);
            setRole(newProf.role);
            localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));
            localStorage.setItem(
              LOCAL_SESSION_USER_KEY,
              JSON.stringify({ id: authUser.id, email: authUser.email })
            );
            if (newProf.vip_code_redeemed) {
              sessionStorage.setItem(PATRON_TOKEN_KEY, newProf.vip_code_redeemed);
              sessionStorage.setItem(PATRON_ROLE_KEY, newProf.role);
            }
          }

          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback')) {
            window.history.replaceState({}, '', '/community');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setRole('FREE');
          localStorage.removeItem(LOCAL_PROFILE_KEY);
          localStorage.removeItem(LOCAL_SESSION_USER_KEY);
          sessionStorage.removeItem(PATRON_TOKEN_KEY);
          sessionStorage.removeItem(PATRON_ROLE_KEY);
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

  const openAuthModal = (mode: 'signin' | 'signup' | string = 'signin') => {
    const safeMode = mode === 'signup' ? 'signup' : 'signin';
    setAuthModalMode(safeMode);
    setIsAuthModalOpen(true);
    soundManager.playTone(580, 0.05);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signInWithGoogle = async (): Promise<{ data?: any; error?: any }> => {
    soundManager.playTone(660, 0.08);

    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

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
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    if (!cleanFirst) {
      return { success: false, error: 'First name is required.' };
    }

    try {
      const pendingPass = getStoredVipPass();
      const initialRole = pendingPass ? resolveRoleForCode(pendingPass) : 'FREE';

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
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
          const newProf = enrichProfile({
            id: authUser.id,
            first_name: cleanFirst,
            last_name: cleanLast,
            email: cleanEmail,
            full_name: `${cleanFirst} ${cleanLast}`.trim(),
            role: initialRole,
            vip_code_redeemed: pendingPass || null,
          });

          await persistProfileToSupabase(newProf);
          setProfile(newProf);
          setRole(newProf.role);
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));
          localStorage.setItem(
            LOCAL_SESSION_USER_KEY,
            JSON.stringify({ id: authUser.id, email: authUser.email })
          );
          if (newProf.vip_code_redeemed) {
            sessionStorage.setItem(PATRON_TOKEN_KEY, newProf.vip_code_redeemed);
            sessionStorage.setItem(PATRON_ROLE_KEY, newProf.role);
          }

          syncToGoogleSheets(newProf, pendingPass || undefined);
        }
      } else {
        const simId = `usr-${Date.now()}`;
        const simUser = { id: simId, email: cleanEmail };
        const newProf = enrichProfile({
          id: simId,
          first_name: cleanFirst,
          last_name: cleanLast,
          email: cleanEmail,
          full_name: `${cleanFirst} ${cleanLast}`.trim(),
          role: initialRole,
          vip_code_redeemed: pendingPass || null,
        });

        setUser(simUser);
        setProfile(newProf);
        setRole(newProf.role);
        localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(simUser));
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));
        if (newProf.vip_code_redeemed) {
          sessionStorage.setItem(PATRON_TOKEN_KEY, newProf.vip_code_redeemed);
          sessionStorage.setItem(PATRON_ROLE_KEY, newProf.role);
        }

        syncToGoogleSheets(newProf, pendingPass || undefined);
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

          let targetRole = profData?.role || 'FREE';
          let targetPassCode = profData?.vip_code_redeemed || null;

          if (pendingPass && (targetRole === 'FREE' || !targetPassCode)) {
            const vipRole = resolveRoleForCode(pendingPass);
            targetRole = pickHigherRole(targetRole, vipRole);
            targetPassCode = pendingPass;
          }

          const resolvedProf = enrichProfile(
            profData || {
              id: authUser.id,
              email: cleanEmail,
              first_name: cleanEmail.split('@')[0],
              last_name: '',
              full_name: cleanEmail.split('@')[0],
              role: targetRole,
            },
            targetPassCode
          );

          if (!profData || targetRole !== profData.role || targetPassCode !== profData.vip_code_redeemed) {
            await persistProfileToSupabase(resolvedProf);
            syncToGoogleSheets(resolvedProf, targetPassCode || undefined);
          }

          setProfile(resolvedProf);
          setRole(resolvedProf.role);
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(resolvedProf));
          localStorage.setItem(
            LOCAL_SESSION_USER_KEY,
            JSON.stringify({ id: authUser.id, email: authUser.email })
          );
          if (resolvedProf.vip_code_redeemed) {
            sessionStorage.setItem(PATRON_TOKEN_KEY, resolvedProf.vip_code_redeemed);
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
            role: pendingPass ? resolveRoleForCode(pendingPass) : 'FREE',
            vip_code_redeemed: pendingPass || null,
            created_at: new Date().toISOString(),
          };
        }

        const enriched = enrichProfile(currentProf, pendingPass);
        const simUser = { id: enriched.id, email: cleanEmail };
        setUser(simUser);
        setProfile(enriched);
        setRole(enriched.role);
        localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(simUser));
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(enriched));
        if (enriched.vip_code_redeemed) {
          sessionStorage.setItem(PATRON_TOKEN_KEY, enriched.vip_code_redeemed);
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

  const signOut = async () => {
    soundManager.playTone(440, 0.08);
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setRole('FREE');
    localStorage.removeItem(LOCAL_PROFILE_KEY);
    localStorage.removeItem(LOCAL_SESSION_USER_KEY);
    sessionStorage.removeItem(PATRON_TOKEN_KEY);
    sessionStorage.removeItem(PATRON_ROLE_KEY);
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

      sessionStorage.setItem(PATRON_TOKEN_KEY, clean);
      sessionStorage.setItem(PATRON_ROLE_KEY, targetRole === 'CREATOR' ? 'CREATOR' : 'VIP GUEST');
      localStorage.setItem(PENDING_VIP_PASS_KEY, clean);

      const updatedProfile: Profile = enrichProfile(
        profile
          ? {
              ...profile,
              role: pickHigherRole(profile.role, targetRole),
              vip_code_redeemed: clean,
            }
          : {
              id: user?.id || `usr-${Date.now()}`,
              first_name: 'VIP',
              last_name: 'Guest',
              full_name: 'VIP Guest',
              email: user?.email || 'guest@sillowmill.com',
              role: targetRole,
              vip_code_redeemed: clean,
              created_at: new Date().toISOString(),
            },
        clean
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
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        signOut,
        redeemVipCode,
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
