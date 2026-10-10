import { ShieldCheck, Sparkles } from 'lucide-react';
import { SoundtrackButton } from './SoundtrackButton';

interface TopBarProps {
  isUnlocked: boolean;
  isVip?: boolean;
  onNavigateToVerify?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ isUnlocked, isVip = false, onNavigateToVerify }) => {
  return (
    <header className="relative z-30 w-full border-b border-white/10 bg-black/50 backdrop-blur-md px-2.5 xs:px-4 sm:px-6 py-2 sm:py-3.5 overflow-x-clip">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 xs:gap-3 sm:gap-4">
        {/* Zone 1: Clean wordmark */}
        <a
          href="/"
          className="text-xs xs:text-sm sm:text-lg font-display font-bold tracking-[0.14em] sm:tracking-[0.2em] text-white hover:text-cyan-300 transition-colors uppercase whitespace-nowrap shrink-0"
        >
          SILLOW MILL
        </a>

        {/* Zone 2: Clean, simplified navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-white/60">
          <a href="#archives" className="hover:text-white transition-colors">
            Archive
          </a>
          <a href="/community" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Community Hub</span>
          </a>
          {isVip && onNavigateToVerify && (
            <button
              type="button"
              onClick={onNavigateToVerify}
              className="hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Digital Passport</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Actions (Mobile optimized to prevent clipping) */}
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 shrink-0">
          <SoundtrackButton />

          {isUnlocked ? (
            isVip ? (
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 xs:px-2.5 py-1 text-[10px] xs:text-[10.5px] sm:text-[11px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-400/30 rounded-lg sm:rounded-xl whitespace-nowrap shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="tracking-wide">VIP VERIFIED</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 xs:px-2.5 py-1 text-[10px] xs:text-[10.5px] sm:text-[11px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-400/30 rounded-lg sm:rounded-xl whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span className="tracking-wide">ACCESS GRANTED</span>
              </div>
            )
          ) : (
            isVip && onNavigateToVerify && (
              <button
                type="button"
                onClick={onNavigateToVerify}
                className="md:hidden flex items-center gap-1 px-2 py-1 text-[10px] xs:text-[11px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 rounded-lg sm:rounded-xl cursor-pointer whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>Passport</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};

