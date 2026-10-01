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

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'orbit' | 'surface'>('orbit');
  const [backdropOnly, setBackdropOnly] = useState<boolean>(false);

  // Check sessionStorage on mount for persistent VIP unlock across page reloads
  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem('akinoya_vip_unlocked');
      if (savedState === 'true') {
        setIsUnlocked(true);
      }
    } catch {
      // Fallback if sessionStorage is inaccessible
    }
  }, []);

  const handleUnlockSuccess = () => {
    setIsUnlocked(true);
  };

  const handleLockPortal = () => {
    try {
      sessionStorage.removeItem('akinoya_vip_unlocked');
    } catch {
      // Fallback
    }
    setIsUnlocked(false);
    setViewMode('orbit');
  };

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#050505] text-white flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Immersive Planet Äkinoya Canvas with exact user background & particles */}
      <AkinoyaPlanetCanvas viewMode={viewMode} hideOverlay={backdropOnly} />

      {/* Top Bar Navigation (Zone 1, 2, 3) */}
      {!backdropOnly && <TopBar isUnlocked={isUnlocked} />}

      {/* Dynamic Center Content */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center py-6 sm:py-12 px-2 sm:px-4">
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

      {/* Luxury Minimalist Footer */}
      {!backdropOnly && (
        <footer className="relative z-20 w-full border-t border-white/5 bg-black/50 backdrop-blur-sm py-3 px-4 sm:px-6 text-center">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] sm:text-xs font-mono text-white/40">
            <div>
              © 2027 SILLOW MILL <span className="text-white/20">/</span> ALL RIGHTS RESERVED
            </div>
            <div className="flex items-center gap-3 text-[10px] sm:text-[11px]">
              <span className="text-cyan-400/80">ÄKINOYA LIVE PROTOCOL</span>
              <span className="text-white/20">·</span>
              <span>ARCHIVE ACCESS SECURED</span>
            </div>
          </div>
        </footer>
      )}
    </main>
  );
}
