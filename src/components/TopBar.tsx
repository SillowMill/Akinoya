import React from 'react';
import { Orbit, Sparkles, Users } from 'lucide-react';
import { SoundtrackButton } from './SoundtrackButton';
import { AuthHeaderButton } from './AuthHeaderButton';
import { useAuth } from '../context/AuthContext';
import { openClaimWorldModal } from '../utils/pioneer';
import { getUserStatusConfig } from '../utils/statusPill';
import { soundManager } from '../utils/audio';
import sillowMillLogoUrl from '../assets/images/Sillowmilllogo.png';

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
        {/* Zone 1: High-End Shimmering Header Logo, Reflective Chrome Divider & Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            soundManager.playTone(600, 0.04);
            try {
              sessionStorage.setItem('akinoya_portal_active_tab', 'pass');
              sessionStorage.setItem('akinoya_portal_pass_subview', 'overview');
            } catch {
              // ignore
            }
            if (onNavigateHome) {
              onNavigateHome();
            } else if (typeof window !== 'undefined') {
              if (window.location.pathname === '/' || window.location.pathname === '') {
                window.dispatchEvent(new CustomEvent('akinoya-navigate-passperks-home'));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                window.location.href = '/?tab=pass#pass';
              }
            }
          }}
          className="group flex items-center gap-2 xs:gap-2.5 sm:gap-3 shrink-0 cursor-pointer min-w-0"
          title="Sillow Mill — Pass Perks Home"
        >
          {/* Shimmering Logo with subtle cinematic glow & glass housing */}
          <div className="relative w-6 h-6 xs:w-6.5 xs:h-6.5 sm:w-7 sm:h-7 lg:w-7.5 lg:h-7.5 rounded-lg bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-1 border border-white/20 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,255,255,0.18)] group-hover:shadow-[0_0_20px_rgba(251,191,36,0.35)] group-hover:border-amber-400/50 transition-all duration-300">
            {/* Cinematic Specular Sheen */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity" />
            <img
              src={sillowMillLogoUrl}
              alt="Sillow Mill Emblem"
              className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(255,255,255,0.6)] group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Minimalist Reflective Chrome / Brushed Metal Vertical Divider (Tussenschotje) */}
          <div
            className="h-3.5 sm:h-4 lg:h-4.5 w-[1px] bg-gradient-to-b from-white/10 via-white/45 to-white/10 shadow-[0_0_6px_rgba(255,255,255,0.3)] shrink-0"
            aria-hidden="true"
          />

          {/* Brand Wordmark */}
          <span className="text-[12.5px] xs:text-[13.5px] sm:text-[14.5px] md:text-[14px] lg:text-[15px] xl:text-lg font-display font-bold tracking-[0.14em] sm:tracking-[0.16em] md:tracking-[0.14em] lg:tracking-[0.16em] xl:tracking-[0.2em] text-white group-hover:text-amber-200/95 transition-colors uppercase whitespace-nowrap">
            SILLOW MILL
          </span>
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
            <span className="hidden xl:inline">Galaxy Navigator</span>
            <span className="xl:hidden">Galaxy</span>
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
            <span className="hidden xl:inline">Community Hub</span>
            <span className="xl:hidden">Community</span>
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

