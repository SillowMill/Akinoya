/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { AkinoyaPlanetCanvas } from './components/AkinoyaPlanetCanvas';
import { ComingSoonGate } from './components/ComingSoonGate';
import { UnlockedExperience } from './components/UnlockedExperience';
import { TopBar } from './components/TopBar';
import { FloatingAudioControl } from './components/FloatingAudioControl';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { KycVerification } from './components/KycVerification';
import { CheckoutSuccess } from './components/CheckoutSuccess';
import { NfcHudToast } from './components/NfcHudToast';
import { AkinoyaPassportVerification } from './components/AkinoyaPassportVerification';
const CommunityHub = React.lazy(() =>
  import('./components/CommunityHub').then((m) => ({ default: m.CommunityHub }))
);
import { CreatorPortfolioView } from './components/CreatorPortfolioView';
import { ContestLaunchpad } from './components/ContestLaunchpad';
import { GalaxyNavigator } from './components/GalaxyNavigator';
import { PioneerCampaignBanner } from './components/PioneerCampaignBanner';
import { ClaimYourWorldModal } from './components/ClaimYourWorldModal';
import { MembershipGateModal } from './components/MembershipGateModal';
import { useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { hasAnyStoredCertificate } from './utils/certificate';
import { soundManager } from './utils/audio';

export default function App() {
  const { user, profile, role, isAuthenticated, isVip, hasPendingVipInvitation, openAuthModal, isLoading } = useAuth();

  const isUserVip = Boolean(
    (Boolean(user || profile) && (
      isVip ||
      profile?.has_vip_pass === true ||
      profile?.is_vip === true ||
      role === 'VIP_GUEST' ||
      role === 'CREATOR' ||
      Boolean(profile?.vip_code_redeemed)
    )) ||
    hasAnyStoredCertificate() ||
    (typeof window !== 'undefined' &&
      (Boolean(localStorage.getItem('akinoya_patron_token')) ||
       Boolean(sessionStorage.getItem('akinoya_patron_token')) ||
       Boolean(localStorage.getItem('akinoya_bingaa_certificates')) ||
       Boolean(localStorage.getItem('sillow_vip_device_access') === 'true') ||
       Boolean(sessionStorage.getItem('akinoya_vip_unlocked') === 'true') ||
       Boolean(localStorage.getItem('sillow_vip_bound_token')) ||
       localStorage.getItem('akinoya_patron_role') === 'CREATOR' ||
       localStorage.getItem('akinoya_patron_role') === 'VIP_GUEST'))
  );

  // Persistent Public & Account Unlock:
  // Automatically bypass all lock gating if authenticated or local storage has an active session/unlock
  const [publicUnlocked, setPublicUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('akinoya_public_unlocked') === 'true' ||
        sessionStorage.getItem('akinoya_public_unlocked') === 'true'
      );
    }
    return false;
  });

  // Listen to global logout event & reset state to public landing view
  useEffect(() => {
    const handleLogoutSync = () => {
      setPublicUnlocked(false);
      setViewMode('orbit');
      setRoute('home');
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.history.replaceState({}, '', '/');
      }
    };

    window.addEventListener('akinoya-auth-logout', handleLogoutSync);
    return () => window.removeEventListener('akinoya-auth-logout', handleLogoutSync);
  }, []);

  // Listen to post-auth navigation event to route directly to home ('/')
  useEffect(() => {
    const handleNavigateHome = () => {
      setRoute('home');
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.history.replaceState({}, '', '/');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('akinoya-navigate-home', handleNavigateHome);
    return () => window.removeEventListener('akinoya-navigate-home', handleNavigateHome);
  }, []);

  // Safe fallback if user state transitions to unauthenticated
  useEffect(() => {
    if (!isAuthenticated && !user && publicUnlocked) {
      if (
        typeof window !== 'undefined' &&
        !localStorage.getItem('akinoya_public_unlocked') &&
        !sessionStorage.getItem('akinoya_public_unlocked')
      ) {
        setPublicUnlocked(false);
      }
    }
  }, [isAuthenticated, user, publicUnlocked]);

  const isSiteUnlocked = Boolean(
    (isAuthenticated && Boolean(user || profile)) ||
    (role && role !== 'FREE') ||
    isUserVip ||
    (publicUnlocked &&
      typeof window !== 'undefined' &&
      (localStorage.getItem('akinoya_public_unlocked') === 'true' ||
        sessionStorage.getItem('akinoya_public_unlocked') === 'true'))
  );

  const [viewMode, setViewMode] = useState<'orbit' | 'surface'>('orbit');
  const [backdropOnly, setBackdropOnly] = useState<boolean>(false);

  // VIP Sub-view inside /verify route: 'passport' (HUD Certificate) | 'portal' (Personalized VIP Unlocked Portal)
  const [vipSubView, setVipSubView] = useState<'passport' | 'portal'>('passport');
  const [isClaimWorldOpen, setIsClaimWorldOpen] = useState<boolean>(false);

  const [creatorUsername, setCreatorUsername] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/creators/')) {
        const u = window.location.pathname.replace(/^\/creators\/?/, '').split('/')[0].trim();
        if (u) return u;
      }
    }
    return 'odi';
  });

  const [route, setRoute] = useState<'home' | 'privacy' | 'kyc' | 'success' | 'verify' | 'community' | 'creators' | 'contest' | 'galaxy'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const searchParams = new URLSearchParams(window.location.search);
      const isSupabaseAuth = Boolean(
        searchParams.get('type') ||
        searchParams.get('token_hash') ||
        searchParams.get('code') ||
        window.location.hash.includes('access_token')
      );
      if (path === '/galaxy' || path.startsWith('/galaxy')) return 'galaxy';
      if (path === '/contest' || path.startsWith('/contest/')) return 'contest';
      if (path === '/creators' || path.startsWith('/creators/')) return 'creators';
      if (path === '/community' || path.startsWith('/community/')) return 'community';
      if (path === '/auth/callback' || path.startsWith('/auth/callback') || path === '/update-password' || path.startsWith('/update-password') || isSupabaseAuth) {
        return 'home';
      }
      if (path === '/privacy' || path.startsWith('/privacy/')) return 'privacy';
      if (path === '/kyc' || path.startsWith('/kyc/')) return 'kyc';
      if (path === '/success' || path.startsWith('/success/')) return 'success';
      if (path === '/unlocked' || path.startsWith('/unlocked')) {
        try {
          localStorage.setItem('akinoya_public_unlocked', 'true');
          sessionStorage.setItem('akinoya_public_unlocked', 'true');
        } catch {
          // ignore
        }
        return 'home';
      }
      const queryPassCandidate = (
        searchParams.get('nfc_token') ||
        searchParams.get('nfc') ||
        searchParams.get('pass') ||
        searchParams.get('token') ||
        ''
      ).trim().toUpperCase().replace(/^#/, '');
      const hasValidQueryPass = /^AKN-VIP-\d{4}-[A-Z]\d{3,4}$|^AKN-\d{4}$|^SM\d{3}-[A-Z0-9]{4}$/.test(queryPassCandidate);
      if (
        path === '/verify' ||
        path.startsWith('/verify/') ||
        path === '/vip' ||
        Boolean(searchParams.get('enc')) ||
        hasValidQueryPass
      ) {
        return 'verify';
      }
    }
    return 'home';
  });

  // Redirect incoming valid NFC token parameters from root domain directly to /verify/[id]
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(window.location.search);
    const isSupabaseAuth = Boolean(
      searchParams.get('type') ||
      searchParams.get('token_hash') ||
      searchParams.get('code') ||
      window.location.hash.includes('access_token')
    );

    if (path === '/auth/callback' || path.startsWith('/auth/callback') || path === '/update-password' || path.startsWith('/update-password') || isSupabaseAuth) {
      setRoute('home');
      return;
    }

    const token =
      searchParams.get('nfc_token') ||
      searchParams.get('nfc') ||
      searchParams.get('pass') ||
      searchParams.get('token');
    if (token) {
      const cleanToken = token.trim().toUpperCase().replace(/^#/, '');
      if (cleanToken === 'PATRON-TEST-ACCESS' || cleanToken === 'PATRON') {
        window.history.replaceState({}, '', '/');
        setRoute('home');
        return;
      }
      const isPassId = /^AKN-VIP-\d{4}-[A-Z]\d{3,4}$|^AKN-\d{4}$|^SM\d{3}-[A-Z0-9]{4}$/.test(cleanToken);
      if (isPassId) {
        window.history.replaceState({}, '', `/verify/${cleanToken}`);
        setRoute('verify');
      }
    }
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const searchParams = new URLSearchParams(window.location.search);
      const isSupabaseAuth = Boolean(
        searchParams.get('type') ||
        searchParams.get('token_hash') ||
        searchParams.get('code') ||
        window.location.hash.includes('access_token')
      );
      const queryPassCandidate = (
        searchParams.get('nfc_token') ||
        searchParams.get('nfc') ||
        searchParams.get('pass') ||
        searchParams.get('token') ||
        ''
      ).trim().toUpperCase().replace(/^#/, '');
      const hasValidQueryPass = !isSupabaseAuth && /^AKN-VIP-\d{4}-[A-Z]\d{3,4}$|^AKN-\d{4}$|^SM\d{3}-[A-Z0-9]{4}$/.test(queryPassCandidate);

      if (path === '/galaxy' || path.startsWith('/galaxy')) {
        setRoute('galaxy');
      } else if (path === '/contest' || path.startsWith('/contest/')) {
        setRoute('contest');
      } else if (path === '/creators' || path.startsWith('/creators/')) {
        const u = window.location.pathname.replace(/^\/creators\/?/, '').split('/')[0].trim() || 'odi';
        setCreatorUsername(u);
        setRoute('creators');
      } else if (
        path === '/community' ||
        path.startsWith('/community/')
      ) {
        setRoute('community');
      } else if (path === '/privacy' || path.startsWith('/privacy/')) {
        setRoute('privacy');
      } else if (path === '/kyc' || path.startsWith('/kyc/')) {
        setRoute('kyc');
      } else if (path === '/success' || path.startsWith('/success/')) {
        setRoute('success');
      } else if (path === '/unlocked' || path.startsWith('/unlocked')) {
        handlePublicUnlockSuccess();
        setRoute('home');
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('akinoya-open-visualizer-hub'));
          }, 50);
        }
      } else if (
        !isSupabaseAuth &&
        (path === '/verify' ||
         path.startsWith('/verify/') ||
         path === '/vip' ||
         Boolean(searchParams.get('enc')) ||
         hasValidQueryPass)
      ) {
        if (isUserVip && !searchParams.get('claim')) {
          handlePublicUnlockSuccess();
          navigateTo('home', '/?tab=assets#assets');
        } else {
          setRoute('verify');
        }
      } else {
        setRoute('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isUserVip]);

  // Guard on verify route: if logged-in user already holds a verified pass, prevent claim loop and redirect to assets
  useEffect(() => {
    if (route === 'verify' && isUserVip) {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        if (!searchParams.get('claim')) {
          handlePublicUnlockSuccess();
          navigateTo('home', '/?tab=assets#assets');
        }
      }
    }
  }, [route, isUserVip]);

  // Listen for global Claim World modal open requests
  useEffect(() => {
    const handleOpenClaim = () => {
      setIsClaimWorldOpen(true);
    };
    window.addEventListener('akinoya-open-claim-world', handleOpenClaim);
    return () => window.removeEventListener('akinoya-open-claim-world', handleOpenClaim);
  }, []);

  const navigateTo = (
    newRoute: 'home' | 'privacy' | 'kyc' | 'success' | 'verify' | 'community' | 'creators' | 'contest' | 'galaxy',
    path: string
  ) => {
    try {
      window.history.pushState({}, '', path);
    } catch {
      // Fallback
    }
    setRoute(newRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToPassperksHome = () => {
    soundManager.playTone(600, 0.04);
    try {
      sessionStorage.setItem('akinoya_portal_active_tab', 'pass');
    } catch {
      // ignore
    }
    navigateTo('home', '/');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('akinoya-navigate-passperks-home'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateToGalaxy = (planetId?: string) => {
    const targetPath = planetId ? `/galaxy?planet=${encodeURIComponent(planetId)}` : '/galaxy';
    navigateTo('galaxy', targetPath);
  };

  const handlePublicUnlockSuccess = () => {
    try {
      localStorage.setItem('akinoya_public_unlocked', 'true');
      sessionStorage.setItem('akinoya_public_unlocked', 'true');
    } catch {
      // Fallback
    }
    setPublicUnlocked(true);
  };

  const handleOpenVisualizerHub = () => {
    handlePublicUnlockSuccess();
    navigateTo('home', '/?tab=pass&subview=hub');
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('akinoya-open-visualizer-hub'));
      }, 50);
    }
  };

  const handlePublicLock = () => {
    // If user is authenticated, NEVER force them into a locked state!
    if (isAuthenticated || Boolean(user || profile) || role !== 'FREE') {
      return;
    }
    try {
      localStorage.removeItem('akinoya_public_unlocked');
      sessionStorage.removeItem('akinoya_public_unlocked');
    } catch {
      // Fallback
    }
    setPublicUnlocked(false);
    setViewMode('orbit');
  };

  const isCanvasUnlocked = route === 'verify' ? true : isSiteUnlocked;
  const isVipRoute = route === 'verify';

  return (
    <main className="app-shell relative min-h-[100dvh] w-full bg-[#050505] text-white flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Official Pioneer Launch Countdown Announcement Banner (Strictly post-auth dashboard across all devices) */}
      {isSiteUnlocked && route !== 'galaxy' && (
        <PioneerCampaignBanner
          isUnlocked={isSiteUnlocked}
          onOpenClaimModal={() => setIsClaimWorldOpen(true)}
        />
      )}

      {/* Global VIP Referral Invitation Top Banner */}
      {hasPendingVipInvitation && !isAuthenticated && (
        <div className="relative z-[60] w-full bg-gradient-to-r from-amber-950/95 via-yellow-950/90 to-amber-950/95 border-b border-amber-500/40 px-3 sm:px-6 py-2 sm:py-2.5 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 shadow-[0_4px_25px_rgba(245,158,11,0.25)] shrink-0">
          <div className="flex items-center gap-2.5 text-xs text-amber-200 font-sans min-w-0">
            <span className="p-1 rounded-md bg-yellow-400/20 text-yellow-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            </span>
            <span className="font-mono font-bold text-yellow-400 uppercase tracking-wider text-[11px] shrink-0">
              VIP Guest Pass Invited:
            </span>
            <span className="truncate text-white/90">
              Sign in to claim instant access to Creator Lab channels, exclusive audio masters &amp; visualizers.
            </span>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('signin')}
            className="px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-bold text-[11px] tracking-wider transition-all cursor-pointer shadow-md shrink-0 flex items-center gap-1.5"
          >
            <span>Claim VIP Invitation</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Global NFC Magic Link Verification HUD Toast (Strictly restricted to explicit VIP access route) */}
      {isVipRoute && <NfcHudToast />}

      {/* Immersive Planet Äkinoya Canvas (hidden on Galaxy Navigator and Community Hub routes) */}
      {route !== 'galaxy' && route !== 'community' && (
        <AkinoyaPlanetCanvas viewMode={viewMode} hideOverlay={backdropOnly} isUnlocked={isCanvasUnlocked} />
      )}

      {/* Top Bar Navigation (Zone 1, 2, 3) */}
      {!backdropOnly && route !== 'community' && route !== 'creators' && route !== 'contest' && route !== 'galaxy' && (
        <TopBar
          isUnlocked={isVipRoute || isUserVip ? true : isSiteUnlocked}
          isVip={isVipRoute || isUserVip}
          onNavigateHome={handleNavigateToPassperksHome}
          onNavigateToGalaxy={() => navigateToGalaxy()}
        />
      )}

      {/* Route-Based Dynamic Content */}
      <ErrorBoundary>
        {route === 'galaxy' ? (
          <div className="fixed inset-0 z-30 w-full h-full flex flex-col overflow-hidden">
            <GalaxyNavigator
              onBackToHome={handleNavigateToPassperksHome}
              onNavigateToContest={() => navigateTo('contest', '/contest')}
              onNavigateToCommunity={() => navigateTo('community', '/community')}
              onNavigateToVisualizerHub={handleOpenVisualizerHub}
              onOpenCreator={(u) => {
                setCreatorUsername(u);
                navigateTo('creators', `/creators/${u}`);
              }}
            />
          </div>
        ) : route === 'contest' ? (
          <div className="relative z-20 flex-1 w-full flex flex-col">
            <ContestLaunchpad
              onBackToHome={handleNavigateToPassperksHome}
              onNavigateToCommunity={() => navigateTo('community', '/community')}
              onNavigateToGalaxy={(id) => navigateToGalaxy(id)}
              onNavigateToCreator={(u) => {
                setCreatorUsername(u);
                navigateTo('creators', `/creators/${u}`);
              }}
            />
          </div>
        ) : route === 'creators' ? (
          <div className="relative z-20 flex-1 w-full flex flex-col">
            <CreatorPortfolioView
              username={creatorUsername}
              onBackToCommunity={() => navigateTo('community', '/community')}
              onBackToHome={handleNavigateToPassperksHome}
              onNavigateToCreator={(u) => {
                setCreatorUsername(u);
                navigateTo('creators', `/creators/${u}`);
              }}
            />
          </div>
        ) : route === 'community' ? (
          <div className="relative z-20 flex-1 w-full flex flex-col">
            <React.Suspense
              fallback={
                <div className="flex-1 w-full flex flex-col items-center justify-center p-12 space-y-3 min-h-[60vh]">
                  <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
                  <span className="text-xs font-mono text-cyan-300 tracking-wider uppercase animate-pulse">
                    LOADING COMMUNITY HUB...
                  </span>
                </div>
              }
            >
              <CommunityHub
                onBackToHome={handleNavigateToPassperksHome}
                onOpenCreator={(u) => {
                  setCreatorUsername(u);
                  navigateTo('creators', `/creators/${u}`);
                }}
              />
            </React.Suspense>
          </div>
        ) : route === 'privacy' ? (
          <div className="relative z-20 flex-1 w-full">
            <PrivacyPolicy onBackToHome={handleNavigateToPassperksHome} />
          </div>
        ) : route === 'kyc' ? (
          <div className="relative z-20 flex-1 w-full">
            <KycVerification onBackToHome={handleNavigateToPassperksHome} />
          </div>
        ) : route === 'success' ? (
          <div className="relative z-20 flex-1 w-full">
            <CheckoutSuccess
              onEnterPortal={() => {
                handlePublicUnlockSuccess();
                handleNavigateToPassperksHome();
              }}
              onBackToComic={handleNavigateToPassperksHome}
            />
          </div>
        ) : route === 'verify' ? (
          /* Exclusive VIP Verification & Personal Portal Route (/verify/[id]) */
          <div className="relative z-20 flex-1 w-full">
            {vipSubView === 'passport' ? (
              <AkinoyaPassportVerification
                tokenIdFromRoute={
                  typeof window !== 'undefined'
                    ? window.location.pathname.replace(/^\/verify\/?/, '').replace(/\/+$/, '').trim() || undefined
                    : undefined
                }
                onNavigateHome={handleNavigateToPassperksHome}
                onOpenVisualizerHub={handleOpenVisualizerHub}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-6 sm:py-10 md:py-12 lg:py-14 px-4 xs:px-5 sm:px-6 md:px-8 lg:px-8 max-w-7xl w-full mx-auto">
                <UnlockedExperience
                  isVip={true}
                  onLockPortal={() => setVipSubView('passport')}
                  onNavigateToPassport={() => setVipSubView('passport')}
                  onToggleViewMode={setViewMode}
                  currentViewMode={viewMode}
                  onNavigateToVerify={() => setVipSubView('passport')}
                  onNavigateToContest={() => navigateTo('contest', '/contest')}
                  onNavigateToGalaxy={(id) => navigateToGalaxy(id)}
                />
              </div>
            )}
          </div>
        ) : (
          /* Public Root Domain (100% Locked Site) */
          <div className="relative z-20 flex-1 flex flex-col items-center justify-center py-6 sm:py-10 md:py-12 lg:py-14 px-4 xs:px-5 sm:px-6 md:px-8 lg:px-8 max-w-7xl w-full mx-auto">
            <AnimatePresence mode="wait">
              {!isSiteUnlocked ? (
                <motion.div
                  key="gate-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.5 }}
                  className="w-full flex flex-col items-center"
                >
                  <ComingSoonGate
                    onUnlockSuccess={handlePublicUnlockSuccess}
                    onToggleBackdropMode={() => setBackdropOnly(!backdropOnly)}
                    backdropOnly={backdropOnly}
                  />

                  {/* Minimal atmospheric footer metadata beneath gate */}
                  {!backdropOnly && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25, duration: 0.6 }}
                      className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 text-[10px] sm:text-[11px] font-mono text-white/50 tracking-wider text-center px-4"
                    >
                      <span>ÄKINOYA PROTOCOL</span>
                      <span className="text-white/20">·</span>
                      <span>RA 04h 35m / +16° 30'</span>
                      <span className="text-white/20">·</span>
                      <span className="text-cyan-400">RELEASE 2027</span>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="unlocked-view"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full flex items-center justify-center"
                >
                  <UnlockedExperience
                    isVip={isUserVip}
                    onLockPortal={handlePublicLock}
                    onToggleViewMode={setViewMode}
                    currentViewMode={viewMode}
                    onNavigateToPassport={() => navigateTo('verify', '/verify')}
                    onNavigateToVerify={() => navigateTo('verify', '/verify')}
                    onNavigateToContest={() => navigateTo('contest', '/contest')}
                    onNavigateToGalaxy={(id) => navigateToGalaxy(id)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </ErrorBoundary>

      {/* Luxury Minimalist Footer */}
      {!backdropOnly && route !== 'community' && route !== 'creators' && route !== 'contest' && route !== 'galaxy' && (
        <footer className="relative z-10 w-full border-t border-white/5 bg-black/60 backdrop-blur-md py-4 px-4 sm:px-6 text-center space-y-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] sm:text-xs font-mono text-white/40">
            <div>
              © 2027 SILLOW MILL <span className="text-white/20">/</span> ALL RIGHTS RESERVED
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] sm:text-[11px]">
              <button
                type="button"
                onClick={() => navigateTo('privacy', '/privacy')}
                className="hover:text-cyan-300 transition-colors underline-offset-4 hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-white/20">·</span>
              <button
                type="button"
                onClick={() => navigateTo('kyc', '/kyc')}
                className="hover:text-cyan-300 transition-colors underline-offset-4 hover:underline cursor-pointer"
              >
                KYC Verification
              </button>
              <span className="text-white/20">·</span>
              <span className="text-cyan-400/80">ÄKINOYA LIVE PROTOCOL</span>
              <span className="text-white/20">·</span>
              <span>ARCHIVE ACCESS SECURED</span>
            </div>
          </div>

          {/* Sub-footer Legal Imprint Line */}
          <div className="max-w-7xl mx-auto pt-2 border-t border-white/5 text-[10px] sm:text-[11px] font-mono text-white/35 flex flex-wrap items-center justify-center gap-1 sm:gap-2 leading-relaxed">
            <span>Sillow Mill</span>
            <span className="text-white/20">·</span>
            <span>Enterprise No. (KBO): 1041.720.513</span>
            <span className="text-white/20">·</span>
            <span>VAT: BE 1041.720.513</span>
            <span className="text-white/20">·</span>
            <a href="mailto:Odi@sillowmill.com" className="text-white/50 hover:text-cyan-300 transition-colors">
              Odi@sillowmill.com
            </a>
            <span className="text-white/20">·</span>
            <span>KBC BE97 7460 3951 7915</span>
          </div>
        </footer>
      )}

      {/* Floating Audio Stop/Play Control (Always accessible while scrolling) */}
      {!backdropOnly && route !== 'community' && route !== 'creators' && (
        <FloatingAudioControl isGalaxy={route === 'galaxy'} />
      )}

      {/* Claim Your World / Pioneer 2027 Early Access Interactive Modal */}
      <ClaimYourWorldModal
        isOpen={isClaimWorldOpen}
        onClose={() => setIsClaimWorldOpen(false)}
        onNavigateToContest={() => navigateTo('contest', '/contest')}
      />

      {/* Post-Launch Membership Gate Modal */}
      <MembershipGateModal />
    </main>
  );
}
