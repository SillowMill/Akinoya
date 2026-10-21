/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowRight, Globe2, X, Clock } from 'lucide-react';
import { calculateLaunchCountdown, CountdownTime, openClaimWorldModal } from '../utils/pioneer';
import { soundManager } from '../utils/audio';
import { useAuth } from '../context/AuthContext';

interface PioneerCampaignBannerProps {
  onOpenClaimModal?: () => void;
  isUnlocked?: boolean;
}

export const PioneerCampaignBanner: React.FC<PioneerCampaignBannerProps> = ({ onOpenClaimModal, isUnlocked }) => {
  const { isAuthenticated, user, profile } = useAuth();
  const isAuthed = Boolean(isUnlocked ?? (isAuthenticated || user || profile));

  // Global Visibility Guard: Universally removed on pre-auth landing across all responsive breakpoints
  if (!isAuthed) {
    return null;
  }

  const [countdown, setCountdown] = useState<CountdownTime>(calculateLaunchCountdown);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('akinoya_pioneer_banner_dismissed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateLaunchCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOpen = () => {
    soundManager.playTone(520, 0.05);
    if (onOpenClaimModal) {
      onOpenClaimModal();
    } else {
      openClaimWorldModal();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('akinoya_pioneer_banner_dismissed', 'true');
    } catch {
      // Ignore
    }
  };

  if (isDismissed) {
    return (
      <div
        className="fixed bottom-4 left-4 z-[70] hidden sm:block"
        style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
      >
        <button
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#050812]/95 border border-amber-400/50 hover:border-amber-400 text-amber-300 font-mono text-[11px] shadow-[0_0_20px_rgba(245,158,11,0.35)] backdrop-blur-xl transition-all cursor-pointer hover:scale-105"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-bold tracking-wider">CREATE YOUR FREE WORLD · BEFORE 09/01/2027</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative z-40 w-full bg-[#050812]/95 border-b border-white/10 px-3 sm:px-4 md:px-5 lg:px-6 xl:px-10 py-1.5 md:py-2 backdrop-blur-xl shadow-md overflow-hidden">
      {/* Ambient background gold glow lines */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto flex flex-col gap-1 md:flex-row md:items-center md:justify-between md:gap-3 lg:gap-4 min-w-0">
        {/* Row 1 (mobile) / Left (desktop): beacon, badge, headline + mobile dismiss */}
        <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 min-w-0 flex-1 md:justify-start">
          <div className="relative shrink-0 flex items-center justify-center">
            <span className="absolute w-2.5 h-2.5 rounded-full bg-amber-400/40 animate-ping" />
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,1)]" />
          </div>

          <div className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono text-[10.5px] font-bold tracking-wider uppercase shrink-0 shadow-sm">
            <Globe2 className="w-3 h-3 text-amber-400" />
            <span>[PIONEER-2027]</span>
          </div>

          <p className="text-[11px] md:text-xs text-white/90 font-sans leading-tight min-w-0 flex-1 truncate xl:whitespace-normal xl:overflow-visible">
            <span className="font-semibold text-amber-300 font-mono tracking-wide">
              Create your free world before 09/01/2027.
            </span>{' '}
            <span className="hidden xl:inline text-white/75">
              After launch, planetary claims and full community access require a paid membership (€60/year)!
            </span>
          </p>

          <button
            type="button"
            onClick={handleDismiss}
            className="md:hidden shrink-0 text-white/50 hover:text-white/80 p-1 -mr-1 rounded cursor-pointer"
            title="Dismiss announcement"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Row 2 (mobile) / Right (desktop): countdown ticker & CTA */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0 justify-between md:justify-end">
          <div className="flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 rounded-md md:rounded-lg bg-black/60 border border-white/10 font-mono text-[10px] md:text-[11px] tracking-wide md:tracking-wider whitespace-nowrap shadow-inner min-w-0">
            <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold text-amber-300 truncate">
              T-{countdown.days}D:{countdown.hours}H:{countdown.minutes}M:{countdown.seconds}S
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpen}
            className="px-3 py-1 md:px-4 md:py-1.5 rounded-md md:rounded-lg bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-black font-mono font-bold text-[10.5px] md:text-xs tracking-wide md:tracking-wider transition-colors cursor-pointer shadow-[0_0_14px_rgba(245,158,11,0.4)] active:scale-[0.98] flex items-center justify-center shrink-0 whitespace-nowrap min-h-[28px] md:min-h-0"
          >
            <span>Create Your Free World →</span>
          </button>

          {/* Desktop dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="hidden md:inline-flex text-white/40 hover:text-white/80 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title="Dismiss announcement"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
