/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowRight, Globe2, X, Clock } from 'lucide-react';
import { calculateLaunchCountdown, CountdownTime, openClaimWorldModal } from '../utils/pioneer';
import { soundManager } from '../utils/audio';

interface PioneerCampaignBannerProps {
  onOpenClaimModal?: () => void;
}

export const PioneerCampaignBanner: React.FC<PioneerCampaignBannerProps> = ({ onOpenClaimModal }) => {
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
      <div className="fixed bottom-4 right-4 z-40 hidden sm:block">
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
    <div className="relative z-[55] w-full bg-[#050812]/95 border-b border-white/10 px-3 sm:px-6 py-3 sm:py-2.5 backdrop-blur-xl shadow-2xl transition-all duration-300">
      {/* Ambient background gold glow lines */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 pointer-events-none" />

      {/* Mobile Top-Right Dismiss Button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-2 right-2 md:hidden text-white/40 hover:text-white/80 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer z-10"
        title="Dismiss announcement"
        aria-label="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative max-w-7xl mx-auto flex flex-col gap-2 p-3 text-center md:flex-row md:items-center md:justify-between md:text-left sm:gap-3 md:gap-4">
        {/* Left: Gold beacon, badge, and official launch headline */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-xs w-full md:w-auto flex-1 justify-center md:justify-start px-6 md:px-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative shrink-0 flex items-center justify-center">
              <span className="absolute w-3 h-3 rounded-full bg-amber-400/40 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,1)]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono text-[10px] sm:text-[10.5px] font-bold tracking-wider uppercase shrink-0 shadow-sm">
              <Globe2 className="w-3 h-3 text-amber-400" />
              <span>[PIONEER-2027]</span>
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-white/90 font-sans leading-snug text-center md:text-left">
            <span className="font-semibold text-amber-300 font-mono tracking-wide">
              Create your free world before 09/01/2027.
            </span>{' '}
            <span className="text-white/75">
              After launch, planetary claims and full community access require a paid membership (€60/year)!
            </span>
          </p>
        </div>

        {/* Right: Live Countdown ticker & Interactive CTA button */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full md:w-auto shrink-0 justify-center md:justify-end">
          {/* Live countdown ticker */}
          <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 border border-white/10 text-white font-mono text-[10px] xs:text-[10.5px] sm:text-[11px] tracking-wider text-amber-200/90 whitespace-nowrap shadow-inner w-full sm:w-auto">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold text-amber-300">
              [ T- {countdown.days}D : {countdown.hours}H : {countdown.minutes}M : {countdown.seconds}S ]
            </span>
          </div>

          {/* CTA Action button scaled for mobile tap targets without overflow */}
          <button
            type="button"
            onClick={handleOpen}
            className="w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-black font-mono font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 shrink-0 min-h-[40px] sm:min-h-0"
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
