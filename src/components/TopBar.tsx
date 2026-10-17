import React from 'react';
import { Orbit, Sparkles, Users } from 'lucide-react';
import { SoundtrackButton } from './SoundtrackButton';
import { AuthHeaderButton } from './AuthHeaderButton';
import { useAuth } from '../context/AuthContext';
import { openClaimWorldModal } from '../utils/pioneer';
import { getUserStatusConfig } from '../utils/statusPill';
import { hasAnyStoredCertificate } from '../utils/certificate';

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

  const hasClaimedPass = Boolean(
    effectiveIsVip ||
    isVip ||
    authIsVip ||
    profile?.has_vip_pass === true ||
    profile?.is_vip === true ||
    role === 'VIP_GUEST' ||
    role === 'CREATOR' ||
    Boolean(profile?.vip_code_redeemed) ||
    hasAnyStoredCertificate() ||
    (typeof window !== 'undefined' && (
      Boolean(localStorage.getItem('akinoya_patron_token')) ||
      Boolean(localStorage.getItem('akinoya_bingaa_certificates')) ||
      Boolean(localStorage.getItem('sillow_vip_device_access') === 'true') ||
      Boolean(sessionStorage.getItem('akinoya_vip_unlocked') === 'true') ||
      Boolean(localStorage.getItem('sillow_vip_bound_token'))
    ))
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0a0b10]/85 backdrop-blur-xl px-3 sm:px-6 lg:px-12 py-3 sm:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4 lg:gap-8">
        {/* Zone 1: Clean wordmark - Pure White */}
        <a
          href="/"
          onClick={(e) => {
            if (onNavigateHome) {
              e.preventDefault();
              onNavigateHome();
            }
          }}
          className="text-[14.5px] xs:text-[15.5px] sm:text-base lg:text-lg font-display font-bold tracking-[0.18em] sm:tracking-[0.2em] text-white hover:text-white/80 transition-colors uppercase whitespace-nowrap shrink-0 cursor-pointer"
        >
          SILLOW MILL
        </a>

        {/* Zone 2: Single-line typography navigation links with dedicated brand colors and subtle dividers */}
        <nav className="hidden md:flex items-center gap-2.5 lg:gap-5 font-mono text-[11px] lg:text-xs uppercase tracking-wide whitespace-nowrap">
          <a
            href="/galaxy"
            onClick={(e) => {
              if (onNavigateToGalaxy) {
                e.preventDefault();
                onNavigateToGalaxy();
              }
            }}
            className="inline-flex items-center gap-1.5 text-[#38bdf8] hover:text-[#22d3ee] font-bold whitespace-nowrap transition-colors cursor-pointer"
          >
            <Orbit className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Galaxy Navigator</span>
          </a>

          <span className="text-white/20 select-none text-[11px]" aria-hidden="true">|</span>

          <button
            type="button"
            onClick={() => openClaimWorldModal()}
            className="inline-flex items-center gap-1.5 text-[#f59e0b] hover:text-[#fbbf24] font-semibold whitespace-nowrap transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Claim World</span>
          </button>

          <span className="text-white/20 select-none text-[11px]" aria-hidden="true">|</span>

          <a
            href="/community"
            className="inline-flex items-center gap-1.5 text-[#38bdf8] hover:text-[#22d3ee] font-bold whitespace-nowrap transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Community Hub</span>
          </a>

          {/* Digital Passport: Only visible on large desktop for guests / unverified users */}
          {!hasClaimedPass && (
            <span className="hidden xl:inline-flex items-center gap-2.5">
              <span className="text-white/20 select-none text-[11px]" aria-hidden="true">|</span>
              {onNavigateToVerify ? (
                <button
                  type="button"
                  onClick={onNavigateToVerify}
                  className="text-slate-300 hover:text-white font-semibold whitespace-nowrap transition-colors cursor-pointer"
                >
                  Digital Passport
                </button>
              ) : (
                <a
                  href="/verify"
                  className="text-slate-300 hover:text-white font-semibold whitespace-nowrap transition-colors cursor-pointer"
                >
                  Digital Passport
                </a>
              )}
            </span>
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

