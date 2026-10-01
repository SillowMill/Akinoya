import React from 'react';
import { Sparkles, Globe } from 'lucide-react';
import { SoundtrackButton } from './SoundtrackButton';

interface TopBarProps {
  isUnlocked: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ isUnlocked }) => {
  return (
    <header className="relative z-30 w-full border-b border-white/10 bg-black/40 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="/"
          className="text-sm sm:text-xl font-display font-extrabold tracking-[0.22em] text-white hover:text-cyan-300 transition-colors uppercase whitespace-nowrap shrink-0"
        >
          SILLOW MILL
        </a>

        {/* Zone 2: Clean text navigation links (hidden on mobile) */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-mono text-white/60 tracking-wider">
          <a href="#atmosphere" className="hover:text-cyan-300 transition-colors">
            Äkinoya Atmosphere
          </a>
          <a href="#transmission" className="hover:text-cyan-300 transition-colors">
            Lore Transmission
          </a>
          <a href="#cycle2027" className="hover:text-cyan-300 transition-colors">
            Cycle 2027
          </a>
          <a href="#archives" className="hover:text-cyan-300 transition-colors">
            The Archive
          </a>
        </nav>

        {/* Zone 3: Primary actions (Soundtrack & Portal badge) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <SoundtrackButton />

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-mono text-white/60 bg-white/5 border border-white/10 rounded-xl">
            <Globe className="w-3.5 h-3.5 text-cyan-400/80 shrink-0" />
            <span>ÄKINOYA PORTAL</span>
          </div>

          {isUnlocked && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] sm:text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-400/30 rounded-xl">
              <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="hidden xs:inline">VIP VERIFIED</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

