import React from 'react';
import { Orbit, Sparkles, Users } from 'lucide-react';
import { SoundtrackButton } from './SoundtrackButton';
import { AuthHeaderButton } from './AuthHeaderButton';
import { useAuth } from '../context/AuthContext';
import { openClaimWorldModal } from '../utils/pioneer';
import { getUserStatusConfig } from '../utils/statusPill';

interface TopBarProps {
  isUnlocked: boolean;
  isVip?: boolean;
  onNavigateHome?: () => void;
  onNavigateToGalaxy?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isUnlocked: _isUnlocked,
  isVip = false,
  onNavigateHome,
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
    <header
      className="sticky top-0 z-50 isolate w-full max-w-full box-border border-b border-white/10 bg-[#0a0b10]/90 backdrop-blur-xl px-2.5 xs:px-3 sm:px-4 md:px-5 lg:px-6 xl:px-10 py-2 sm:py-2.5 lg:py-3 transform-gpu"
      style={{
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
    >
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-6 min-w-0">
        {/* Zone 1: Clean wordmark - Pure White */}
        <a
          href="/"
          onClick={(e) => {
            if (onNavigateHome) {
              e.preventDefault();
              onNavigateHome();
            }
          }}
          className="text-[13px] xs:text-[14px] sm:text-[15px] md:text-[14px] lg:text-[15px] xl:text-lg font-display font-bold tracking-[0.14em] sm:tracking-[0.16em] md:tracking-[0.14em] lg:tracking-[0.16em] xl:tracking-[0.2em] text-white hover:text-white/80 transition-colors uppercase whitespace-nowrap shrink-0 cursor-pointer"
        >
          SILLOW MILL
        </a>

        {/* Zone 2: Single-line typography navigation links with dedicated brand colors and subtle dividers */}
        <nav className="hidden md:flex items-center justify-center gap-1.5 md:gap-2 lg:gap-3 xl:gap-5 font-mono text-[10px] md:text-[10.5px] lg:text-[11px] xl:text-xs uppercase tracking-normal lg:tracking-tight xl:tracking-wide whitespace-nowrap min-w-0 shrink">
          <a
            href="/galaxy"
            onClick={(e) => {
              if (onNavigateToGalaxy) {
                e.preventDefault();
                onNavigateToGalaxy();
              }
            }}
            className="inline-flex items-center gap-1 lg:gap-1.5 text-[#38bdf8] hover:text-[#22d3ee] font-bold whitespace-nowrap transition-colors cursor-pointer"
          >
            <Orbit className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Galaxy Navigator</span>
          </a>

          <span className="text-white/20 select-none text-[10px] lg:text-[11px]" aria-hidden="true">|</span>

          <button
            type="button"
            onClick={() => openClaimWorldModal()}
            className="inline-flex items-center gap-1 lg:gap-1.5 text-[#f59e0b] hover:text-[#fbbf24] font-semibold whitespace-nowrap transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Claim World</span>
          </button>

          <span className="text-white/20 select-none text-[10px] lg:text-[11px]" aria-hidden="true">|</span>

          <a
            href="/community"
            className="inline-flex items-center gap-1 lg:gap-1.5 text-[#38bdf8] hover:text-[#22d3ee] font-bold whitespace-nowrap transition-colors cursor-pointer"
          >
            <Users className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Community Hub</span>
          </a>
        </nav>

        {/* Zone 3: Actions (iPad Portrait & mobile optimized to prevent clipping) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <SoundtrackButton />
          <AuthHeaderButton />

          {/* ACCESS GRANTED / PUBLIC ACCESS Indicator Box (Desktop >=1280px to avoid crowding iPad landscape) */}
          <div
            title={statusConfig.indicatorLabel}
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-[10.5px] rounded-xl whitespace-nowrap shrink-0 ${statusConfig.indicatorClassName}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusConfig.dotColorClassName}`} />
            <span className="tracking-wide font-bold">{statusConfig.indicatorLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

