/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Clock, Sparkles } from 'lucide-react';
import { calculateLaunchCountdown, CountdownTime } from '../utils/pioneer';
import { useAuth } from '../context/AuthContext';

interface PioneerCampaignBannerProps {
  onOpenClaimModal?: () => void;
  isUnlocked?: boolean;
}

export const PioneerCampaignBanner: React.FC<PioneerCampaignBannerProps> = ({ isUnlocked }) => {
  const { isAuthenticated, user, profile } = useAuth();
  const isAuthed = Boolean(isUnlocked ?? (isAuthenticated || user || profile));

  // Global Visibility Guard: Universally removed on pre-auth landing across all responsive breakpoints
  if (!isAuthed) {
    return null;
  }

  const [countdown, setCountdown] = useState<CountdownTime>(calculateLaunchCountdown);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('akinoya_visualizer_countdown_dismissed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateLaunchCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('akinoya_visualizer_countdown_dismissed', 'true');
    } catch {
      // Ignore
    }
  };

  const handleRestore = () => {
    setIsDismissed(false);
    try {
      sessionStorage.removeItem('akinoya_visualizer_countdown_dismissed');
    } catch {
      // Ignore
    }
  };

  if (isDismissed) {
    if (
      typeof window !== 'undefined' &&
      window.location.pathname.toLowerCase().startsWith('/community')
    ) {
      return null;
    }
    return (
      <div
        className="floating-audio-portrait-offset fixed bottom-4 left-4 z-[60] hidden sm:block"
        style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
      >
        <button
          type="button"
          onClick={handleRestore}
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#030712]/95 border border-cyan-400/40 hover:border-cyan-300 text-cyan-300 font-mono text-[10.5px] shadow-[0_0_20px_rgba(0,240,255,0.25)] backdrop-blur-xl transition-all cursor-pointer hover:scale-105"
          title="Restore Visualizer Hub Countdown"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wider">VISUALIZER HUB LAUNCH · T-{countdown.days}D</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Visualizer Hub Launch Countdown"
      className="relative z-40 w-full bg-[#030712]/95 border-b border-cyan-500/20 px-2.5 xs:px-3 sm:px-4 md:px-6 py-1 sm:py-1.5 backdrop-blur-xl shadow-[0_2px_15px_rgba(0,0,0,0.6)] overflow-hidden"
    >
      {/* Avant-Garde Ambient Cyan Glow Lines */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-cyan-400/5 to-cyan-500/10 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 min-w-0">
        {/* Left: Beacon, Badge, & Headline (Ultra-Compact Single Row) */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
          {/* Cyan Beacon */}
          <div className="relative shrink-0 flex items-center justify-center">
            <span className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400/40 animate-ping" />
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,1)]" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/30 text-cyan-300 font-mono text-[9px] sm:text-[10px] font-bold tracking-wider uppercase shrink-0">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
            <span>[VISUALIZER HUB]</span>
          </div>

          {/* Headline */}
          <p className="text-[10.5px] sm:text-xs text-white/90 font-mono leading-tight min-w-0 truncate">
            <span className="font-semibold text-cyan-200 tracking-wide">
              <span className="hidden md:inline">Official Visualizer Hub Launch: </span>
              <span>January 9, 2027</span>
            </span>
          </p>
        </div>

        {/* Right: Countdown Ticker (NO CTA BUTTON) & Dismiss */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-md bg-black/60 border border-cyan-400/25 font-mono text-[10px] sm:text-[11px] tracking-wider whitespace-nowrap shadow-inner">
            <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="font-bold text-cyan-300">
              T-{countdown.days}D:{countdown.hours}H:{countdown.minutes}M:{countdown.seconds}S
            </span>
          </div>

          {/* Subtle dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="text-white/40 hover:text-cyan-300 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title="Dismiss countdown"
            aria-label="Dismiss countdown"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
