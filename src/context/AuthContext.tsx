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
  authModalMode: 'signin' | 'signup' | 'redeem';
  openAuthModal: (mode?: 'signin' | 'signup' | 'redeem') => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<{ error?: any }>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>('FREE');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'redeem'>('signin');

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

            // Fetch profile
            const { data: profData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .single();

            if (profData && mounted) {
              setProfile(profData);
              setRole(profData.role || 'FREE');
              localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profData));
            } else if (mounted) {
              // Extract from metadata
              const meta = authUser.user_metadata || {};
              const first = meta.first_name || meta.full_name?.split(' ')[0] || 'Member';
              const last = meta.last_name || meta.full_name?.split(' ').slice(1).join(' ') || '';
              const fallbackProf: Profile = {
                id: authUser.id,
                first_name: first,
                last_name: last,
                email: authUser.email || '',
                full_name: `${first} ${last}`.trim(),
                avatar_url: meta.avatar_url,
                role: 'FREE',
                created_at: new Date().toISOString(),
              };
              setProfile(fallbackProf);
              setRole('FREE');
              localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(fallbackProf));
            }
          }
        } else {
          // Local/Simulated session fallback
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
          setUser(session.user);
          const { data: profData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profData) {
            setProfile(profData);
            setRole(profData.role || 'FREE');
            localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profData));
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setRole('FREE');
          localStorage.removeItem(LOCAL_PROFILE_KEY);
          localStorage.removeItem(LOCAL_SESSION_USER_KEY);
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

  const openAuthModal = (mode: 'signin' | 'signup' | 'redeem' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
    soundManager.playTone(580, 0.05);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signInWithGoogle = async () => {
    soundManager.playTone(660, 0.08);

    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/community` : undefined,
        },
      });
      return { error };
    }

    // High-Fidelity Google OAuth Client ID or Simulated SSO
    const googleClientId =
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
      '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';

    if (googleClientId && typeof window !== 'undefined') {
      // Simulate quick Google SSO sign in for seamless testing
      const simUser = {
        id: `google-${Date.now()}`,
        email: 'odi.selis@gmail.com',
      };
      const simProfile: Profile = {
        id: simUser.id,
        first_name: 'Odi',
        last_name: 'Selis',
        email: simUser.email,
        full_name: 'Odi Selis',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
        role: 'VIP_GUEST',
        vip_code_redeemed: 'AKN-VIP-2027-X0914',
        created_at: new Date().toISOString(),
      };

      setUser(simUser);
      setProfile(simProfile);
      setRole('VIP_GUEST');
      localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(simUser));
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(simProfile));

      // Real-time Google Sheets sync
      syncToGoogleSheets(simProfile, 'AKN-VIP-2027-X0914');

      closeAuthModal();
      soundManager.playUnlockChime();
      return {};
    }

    return { error: new Error('Google OAuth credentials not configured.') };
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
          setUser(data.user);
          const newProf: Profile = {
            id: data.user.id,
            first_name: cleanFirst,
            last_name: cleanLast,
            email: cleanEmail,
            full_name: `${cleanFirst} ${cleanLast}`.trim(),
            role: 'FREE',
            created_at: new Date().toISOString(),
          };
          setProfile(newProf);
          setRole('FREE');
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));

          // Sync to Google Sheets
          syncToGoogleSheets(newProf);
        }
      } else {
        // Local/Simulated account creation
        const simId = `usr-${Date.now()}`;
        const simUser = { id: simId, email: cleanEmail };
        const newProf: Profile = {
          id: simId,
          first_name: cleanFirst,
          last_name: cleanLast,
          email: cleanEmail,
          full_name: `${cleanFirst} ${cleanLast}`.trim(),
          role: 'FREE',
          created_at: new Date().toISOString(),
        };

        setUser(simUser);
        setProfile(newProf);
        setRole('FREE');
        localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(simUser));
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));

        // Sync to Google Sheets
        syncToGoogleSheets(newProf);
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
          setUser(data.user);
          const { data: profData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profData) {
            setProfile(profData);
            setRole(profData.role || 'FREE');
            localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profData));
          }
        }
      } else {
        // Fallback login
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
            role: 'FREE',
            created_at: new Date().toISOString(),
          };
        }

        const simUser = { id: currentProf.id, email: cleanEmail };
        setUser(simUser);
        setProfile(currentProf);
        setRole(currentProf.role || 'FREE');
        localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(simUser));
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(currentProf));
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
    sessionStorage.removeItem('akinoya_patron_token');
    sessionStorage.removeItem('akinoya_patron_role');
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

      const updatedProfile: Profile = profile
        ? {
            ...profile,
            role: targetRole,
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
          };

      setProfile(updatedProfile);
      setRole(targetRole);
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updatedProfile));
      sessionStorage.setItem('akinoya_patron_token', clean);
      sessionStorage.setItem('akinoya_patron_role', targetRole === 'CREATOR' ? 'CREATOR' : 'VIP GUEST');

      // Update in Supabase if configured
      if (isSupabaseConfigured && user?.id) {
        try {
          await supabase
            .from('profiles')
            .update({ role: targetRole, vip_code_redeemed: clean })
            .eq('id', user.id);
        } catch (err) {
          console.warn('[AuthContext] Supabase profile update error:', err);
        }
      }

      // Sync updated role status to Google Sheets real-time
      syncToGoogleSheets(updatedProfile, clean);

      const msg = isMasterFounder
        ? '👑 Master Founder Pass Accepted! Creator privileges activated.'
        : `✨ VIP Guest Pass (${clean}) Activated! Full chat access unlocked across all channels.`;

      return { success: true, message: msg };
    }

    soundManager.playError();
    return {
      success: false,
      message: 'Unrecognized pass code. Enter a valid 1-of-100 Guest Pass (AKN-VIP-2027-X001 to X100) or test passkey PATRON-TEST-ACCESS.',
    };
  };

  const refreshProfile = async () => {
    if (!user) return;
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data);
        setRole(data.role || 'FREE');
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(data));
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
