/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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

export default function App() {
  // Public Site Unlock (strictly isolated from VIP status; only unlocked via entering passcode 'SillowMill2027' in ComingSoonGate)
  const [publicUnlocked, setPublicUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('akinoya_public_unlocked') === 'true';
    }
    return false;
  });

  const [viewMode, setViewMode] = useState<'orbit' | 'surface'>('orbit');
  const [backdropOnly, setBackdropOnly] = useState<boolean>(false);

  // VIP Sub-view inside /verify route: 'passport' (HUD Certificate) | 'portal' (Personalized VIP Unlocked Portal)
  const [vipSubView, setVipSubView] = useState<'passport' | 'portal'>('passport');

  const [route, setRoute] = useState<'home' | 'privacy' | 'kyc' | 'success' | 'verify'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (path === '/privacy' || path.startsWith('/privacy/')) return 'privacy';
      if (path === '/kyc' || path.startsWith('/kyc/')) return 'kyc';
      if (path === '/success' || path.startsWith('/success/')) return 'success';
      if (
        path === '/verify' ||
        path.startsWith('/verify/') ||
        path === '/vip' ||
        search.includes('enc=') ||
        search.includes('claim=') ||
        search.includes('token=') ||
        search.includes('nfc=') ||
        search.includes('pass=')
      ) {
        return 'verify';
      }
    }
    return 'home';
  });

  // Redirect incoming token parameters from root domain directly to /verify/[id]
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const token =
      searchParams.get('token') ||
      searchParams.get('nfc_token') ||
      searchParams.get('nfc') ||
      searchParams.get('pass');
    if (token) {
      const cleanToken = token.trim().toUpperCase().replace(/^#/, '');
      window.history.replaceState({}, '', `/verify/${cleanToken}`);
      setRoute('verify');
    }
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (path === '/privacy' || path.startsWith('/privacy/')) {
        setRoute('privacy');
      } else if (path === '/kyc' || path.startsWith('/kyc/')) {
        setRoute('kyc');
      } else if (path === '/success' || path.startsWith('/success/')) {
        setRoute('success');
      } else if (
        path === '/verify' ||
        path.startsWith('/verify/') ||
        path === '/vip' ||
        search.includes('enc=') ||
        search.includes('claim=') ||
        search.includes('token=') ||
        search.includes('nfc=') ||
        search.includes('pass=')
      ) {
        setRoute('verify');
      } else {
        setRoute('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newRoute: 'home' | 'privacy' | 'kyc' | 'success' | 'verify', path: string) => {
    try {
      window.history.pushState({}, '', path);
    } catch {
      // Fallback
    }
    setRoute(newRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePublicUnlockSuccess = () => {
    try {
      sessionStorage.setItem('akinoya_public_unlocked', 'true');
    } catch {
      // Fallback
    }
    setPublicUnlocked(true);
  };

  const handlePublicLock = () => {
    try {
      sessionStorage.removeItem('akinoya_public_unlocked');
    } catch {
      // Fallback
    }
    setPublicUnlocked(false);
    setViewMode('orbit');
  };

  const isCanvasUnlocked = route === 'verify' ? true : publicUnlocked;
  const isVipRoute = route === 'verify';

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#050505] text-white flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Global NFC Magic Link Verification HUD Toast (Strictly restricted to explicit VIP access route) */}
      {isVipRoute && <NfcHudToast />}

      {/* Immersive Planet Äkinoya Canvas */}
      <AkinoyaPlanetCanvas viewMode={viewMode} hideOverlay={backdropOnly} isUnlocked={isCanvasUnlocked} />

      {/* Top Bar Navigation (Zone 1, 2, 3) */}
      {!backdropOnly && (
        <TopBar
          isUnlocked={isVipRoute ? true : publicUnlocked}
          isVip={isVipRoute}
          onNavigateToVerify={isVipRoute ? () => setVipSubView('passport') : undefined}
        />
      )}

      {/* Route-Based Dynamic Content */}
      {route === 'privacy' ? (
        <div className="relative z-20 flex-1 w-full">
          <PrivacyPolicy onBackToHome={() => navigateTo('home', '/')} />
        </div>
      ) : route === 'kyc' ? (
        <div className="relative z-20 flex-1 w-full">
          <KycVerification onBackToHome={() => navigateTo('home', '/')} />
        </div>
      ) : route === 'success' ? (
        <div className="relative z-20 flex-1 w-full">
          <CheckoutSuccess
            onEnterPortal={() => {
              handlePublicUnlockSuccess();
              navigateTo('home', '/');
            }}
            onBackToComic={() => navigateTo('home', '/')}
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
              onNavigateHome={() => navigateTo('home', '/')}
              onOpenVisualizerHub={() => setVipSubView('portal')}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-6 sm:py-10 md:py-12 lg:py-14 px-2 sm:px-4 md:px-6 lg:px-8 max-w-7xl w-full mx-auto">
              <UnlockedExperience
                isVip={true}
                onLockPortal={() => setVipSubView('passport')}
                onNavigateToPassport={() => setVipSubView('passport')}
                onToggleViewMode={setViewMode}
                currentViewMode={viewMode}
                onNavigateToVerify={() => setVipSubView('passport')}
              />
            </div>
          )}
        </div>
      ) : (
        /* Public Root Domain (100% Locked Site) */
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center py-6 sm:py-10 md:py-12 lg:py-14 px-2 sm:px-4 md:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            {!publicUnlocked ? (
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
                  isVip={false}
                  onLockPortal={handlePublicLock}
                  onToggleViewMode={setViewMode}
                  currentViewMode={viewMode}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Luxury Minimalist Footer */}
      {!backdropOnly && (
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
      {!backdropOnly && <FloatingAudioControl />}
    </main>
  );
}
