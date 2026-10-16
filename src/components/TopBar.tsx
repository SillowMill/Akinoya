import { ShieldCheck, Sparkles, Trophy, Globe2, Compass } from 'lucide-react';
import { SoundtrackButton } from './SoundtrackButton';
import { AuthHeaderButton } from './AuthHeaderButton';
import { useAuth } from '../context/AuthContext';
import { openClaimWorldModal } from '../utils/pioneer';
import { getUserStatusConfig } from '../utils/statusPill';

interface TopBarProps {
  isUnlocked: boolean;
  isVip?: boolean;
  onNavigateHome?: () => void;
  onNavigateToVerify?: () => void;
  onNavigateToGalaxy?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isUnlocked: _isUnlocked,
  isVip = false,
  onNavigateHome,
  onNavigateToVerify,
  onNavigateToGalaxy,
}) => {
  const { user, isVip: authIsVip, profile, role, isAuthenticated } = useAuth();
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

  const statusConfig = getUserStatusConfig(
    isAuthenticated,
    user,
    profile,
    role,
    effectiveIsVip
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0a0b10]/85 backdrop-blur-xl px-4 sm:px-8 lg:px-12 py-3 sm:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-6 lg:gap-8">
        {/* Zone 1: Clean wordmark */}
        <a
          href="/"
          onClick={(e) => {
            if (onNavigateHome) {
              e.preventDefault();
              onNavigateHome();
            }
          }}
          className="text-xs xs:text-sm sm:text-base lg:text-lg font-display font-bold tracking-[0.16em] sm:tracking-[0.2em] text-white hover:text-cyan-300 transition-colors uppercase whitespace-nowrap shrink-0 cursor-pointer"
        >
          SILLOW MILL
        </a>

        {/* Zone 2: Clean, simplified navigation links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-mono text-white/70">
          <a
            href="/galaxy"
            onClick={(e) => {
              if (onNavigateToGalaxy) {
                e.preventDefault();
                onNavigateToGalaxy();
              }
            }}
            className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 text-cyan-300/95 font-semibold cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '30s' }} />
            <span>🌌 Galaxy Navigator</span>
          </a>

          <a href="/contest" className="hover:text-amber-300 transition-colors flex items-center gap-1.5 text-amber-300/90 font-semibold">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>🏆 Contest</span>
          </a>

          <button
            type="button"
            onClick={() => openClaimWorldModal()}
            className="hover:text-amber-300 transition-colors flex items-center gap-1.5 text-amber-300/90 font-semibold cursor-pointer"
          >
            <Globe2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>🪐 Claim World</span>
          </button>

          <a href="/community" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>✨ Community Hub</span>
          </a>

          {effectiveIsVip && (
            onNavigateToVerify ? (
              <button
                type="button"
                onClick={onNavigateToVerify}
                className="hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1.5 font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>🛡️ Digital Passport</span>
              </button>
            ) : (
              <a
                href="/verify"
                className="hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1.5 font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>🛡️ Digital Passport</span>
              </a>
            )
          )}
        </nav>

        {/* Zone 3: Actions (Mobile optimized to prevent clipping) */}
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 shrink-0">
          <SoundtrackButton />
          <AuthHeaderButton />

          {/* ACCESS GRANTED / PUBLIC ACCESS Indicator Box */}
          <div
            title={statusConfig.indicatorLabel}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 xs:px-2.5 py-1 text-[10px] sm:text-[10.5px] rounded-lg sm:rounded-xl whitespace-nowrap shrink-0 ${statusConfig.indicatorClassName}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dotColorClassName}`} />
            <span className="hidden sm:inline tracking-wide font-bold">{statusConfig.indicatorLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

