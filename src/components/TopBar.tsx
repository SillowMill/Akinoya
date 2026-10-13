import { ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { SoundtrackButton } from './SoundtrackButton';
import { AuthHeaderButton } from './AuthHeaderButton';
import { useAuth } from '../context/AuthContext';

interface TopBarProps {
  isUnlocked: boolean;
  isVip?: boolean;
  onNavigateHome?: () => void;
  onNavigateToVerify?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isUnlocked,
  isVip = false,
  onNavigateHome,
  onNavigateToVerify,
}) => {
  const { user, isVip: authIsVip, profile, role } = useAuth();
  const effectiveIsVip = Boolean(
    Boolean(user || profile) && (
      isVip ||
      authIsVip ||
      profile?.has_vip_pass === true ||
      profile?.is_vip === true ||
      role === 'VIP_GUEST' ||
      role === 'CREATOR' ||
      Boolean(profile?.vip_code_redeemed) ||
      (typeof window !== 'undefined' &&
        (Boolean(localStorage.getItem('akinoya_patron_token')) ||
         Boolean(sessionStorage.getItem('akinoya_patron_token')) ||
         Boolean(localStorage.getItem('sillow_vip_device_access') === 'true') ||
         Boolean(sessionStorage.getItem('akinoya_vip_unlocked') === 'true') ||
         Boolean(localStorage.getItem('sillow_vip_bound_token')) ||
         localStorage.getItem('akinoya_patron_role') === 'CREATOR' ||
         localStorage.getItem('akinoya_patron_role') === 'VIP_GUEST'))
    )
  );

  return (
    <header className="relative z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md px-2.5 xs:px-4 sm:px-6 py-2 sm:py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 xs:gap-3 sm:gap-4">
        {/* Zone 1: Clean wordmark */}
        <a
          href="/"
          onClick={(e) => {
            if (onNavigateHome) {
              e.preventDefault();
              onNavigateHome();
            }
          }}
          className="text-xs xs:text-sm sm:text-lg font-display font-bold tracking-[0.14em] sm:tracking-[0.2em] text-white hover:text-cyan-300 transition-colors uppercase whitespace-nowrap shrink-0 cursor-pointer"
        >
          SILLOW MILL
        </a>

        {/* Zone 2: Clean, simplified navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-white/60">
          <a href="#archives" className="hover:text-white transition-colors">
            Archive
          </a>
          <a href="/contest" className="hover:text-amber-300 transition-colors flex items-center gap-1.5 text-amber-300/90 font-semibold">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Contest</span>
          </a>
          <a href="/community" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Community Hub</span>
          </a>
          {effectiveIsVip && (
            onNavigateToVerify ? (
              <button
                type="button"
                onClick={onNavigateToVerify}
                className="hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Digital Passport</span>
              </button>
            ) : (
              <a
                href="/verify"
                className="hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Digital Passport</span>
              </a>
            )
          )}
        </nav>

        {/* Zone 3: Actions (Mobile optimized to prevent clipping) */}
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 shrink-0">
          <SoundtrackButton />
          <AuthHeaderButton />

          {isUnlocked ? (
            effectiveIsVip ? (
              <div
                title="VIP Verified"
                className="flex items-center gap-1 sm:gap-1.5 px-2 xs:px-2.5 py-1 text-[10px] xs:text-[10.5px] sm:text-[11px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-400/30 rounded-lg sm:rounded-xl whitespace-nowrap shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="hidden sm:inline tracking-wide">VIP VERIFIED</span>
                <span className="sm:hidden text-[9px] font-bold tracking-wider">VIP</span>
              </div>
            ) : (
              <div
                title="Access Granted"
                className="flex items-center gap-1 sm:gap-1.5 px-2 xs:px-2.5 py-1 text-[10px] xs:text-[10.5px] sm:text-[11px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-400/30 rounded-lg sm:rounded-xl whitespace-nowrap shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span className="hidden sm:inline tracking-wide">ACCESS GRANTED</span>
              </div>
            )
          ) : (
            effectiveIsVip && (
              onNavigateToVerify ? (
                <button
                  type="button"
                  onClick={onNavigateToVerify}
                  className="md:hidden flex items-center gap-1 px-2 py-1 text-[10px] xs:text-[11px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 rounded-lg sm:rounded-xl cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>Passport</span>
                </button>
              ) : (
                <a
                  href="/verify"
                  className="md:hidden flex items-center gap-1 px-2 py-1 text-[10px] xs:text-[11px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 rounded-lg sm:rounded-xl cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>Passport</span>
                </a>
              )
            )
          )}
        </div>
      </div>
    </header>
  );
};

