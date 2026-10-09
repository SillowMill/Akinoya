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
import { useVipAccess } from './context/VipAccessContext';
import { NfcHudToast } from './components/NfcHudToast';

export default function App() {
  const { isVipUnlocked, unlockVip, lockVip } = useVipAccess();
  const [sessionUnlocked, setSessionUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('akinoya_vip_unlocked') === 'true';
    }
    return false;
  });

  const isUnlocked = isVipUnlocked || sessionUnlocked;
  const [viewMode, setViewMode] = useState<'orbit' | 'surface'>('orbit');
  const [backdropOnly, setBackdropOnly] = useState<boolean>(false);
  const [route, setRoute] = useState<'home' | 'privacy' | 'kyc' | 'success'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/privacy' || path.startsWith('/privacy/')) return 'privacy';
      if (path === '/kyc' || path.startsWith('/kyc/')) return 'kyc';
      if (path === '/success' || path.startsWith('/success/')) return 'success';
    }
    return 'home';
  });

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/privacy' || path.startsWith('/privacy/')) {
        setRoute('privacy');
      } else if (path === '/kyc' || path.startsWith('/kyc/')) {
        setRoute('kyc');
      } else if (path === '/success' || path.startsWith('/success/')) {
        setRoute('success');
      } else {
        setRoute('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newRoute: 'home' | 'privacy' | 'kyc' | 'success', path: string) => {
    try {
      window.history.pushState({}, '', path);
    } catch {
      // Fallback
    }
    setRoute(newRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Check sessionStorage on mount for persistent VIP unlock across page reloads
  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem('akinoya_vip_unlocked');
      if (savedState === 'true') {
        setSessionUnlocked(true);
      }
    } catch {
      // Fallback if sessionStorage is inaccessible
    }
  }, []);

  const handleUnlockSuccess = () => {
    setSessionUnlocked(true);
    unlockVip();
  };

  const handleLockPortal = () => {
    try {
      sessionStorage.removeItem('akinoya_vip_unlocked');
    } catch {
      // Fallback
    }
    setSessionUnlocked(false);
    lockVip();
    setViewMode('orbit');
  };

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#050505] text-white flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Global NFC Magic Link Verification HUD Toast */}
      <NfcHudToast />

      {/* Immersive Planet Äkinoya Canvas with exact user background & particles */}
      <AkinoyaPlanetCanvas viewMode={viewMode} hideOverlay={backdropOnly} isUnlocked={isUnlocked} />

      {/* Top Bar Navigation (Zone 1, 2, 3) */}
      {!backdropOnly && <TopBar isUnlocked={isUnlocked} />}

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
              setSessionUnlocked(true);
              unlockVip();
              navigateTo('home', '/');
            }}
            onBackToComic={() => navigateTo('home', '/')}
          />
        </div>
      ) : (
        /* Dynamic Center Content (Gate or Unlocked VIP Experience) */
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center py-6 sm:py-10 md:py-12 lg:py-14 px-2 sm:px-4 md:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            {!isUnlocked ? (
              <motion.div
                key="gate-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5 }}
                className="w-full flex flex-col items-center"
              >
                <ComingSoonGate
                  onUnlockSuccess={handleUnlockSuccess}
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
                    <span>ÄKINOYA SECTOR 04</span>
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
                  onLockPortal={handleLockPortal}
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
