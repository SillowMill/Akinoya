import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  LogOut,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Crown,
  Globe2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../utils/audio';
import { getUserStatusConfig } from '../utils/statusPill';
import { openClaimWorldModal } from '../utils/pioneer';

export const AuthHeaderButton: React.FC = () => {
  const { user, profile, role, isAuthenticated, isVip, hasVipPass, isSubscriber, openAuthModal, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isUserVip = Boolean(
    role !== 'FREE' &&
    role !== 'GUEST' &&
    (
      isVip ||
      hasVipPass ||
      profile?.has_vip_pass ||
      profile?.is_vip ||
      role === 'VIP_GUEST' ||
      role === 'CREATOR'
    )
  );

  const statusConfig = getUserStatusConfig(
    isAuthenticated,
    user,
    profile,
    role,
    isUserVip
  );

  const roleBadge = {
    label: statusConfig.pillLabel,
    className: statusConfig.pillClassName,
  };

  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'Pilot';

  if (!isAuthenticated || !user) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal('signin')}
        className="min-h-[48px] px-2.5 xs:px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-black font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.35)] hover:scale-[1.02] active:scale-[0.98] shrink-0"
      >
        <User className="w-3.5 h-3.5 fill-black shrink-0" />
        <span>SIGN IN<span className="hidden sm:inline"> / JOIN</span></span>
      </button>
    );
  }

  return (
    <div className={`relative shrink-0 ${isDropdownOpen ? 'z-[100]' : 'z-20'}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsDropdownOpen(!isDropdownOpen);
          soundManager.playTone(600, 0.04);
        }}
        className="min-h-[48px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 border border-cyan-500/30 hover:border-cyan-400/60 transition-all cursor-pointer flex items-center gap-2 group shadow-lg"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-black font-mono font-bold text-xs shadow-[0_0_10px_rgba(56,189,248,0.3)] shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>

        {/* Greeting + Role Badge (Hidden on mobile <640px) */}
        <div className="hidden sm:flex flex-col text-left">
          <div className="text-[11px] font-sans font-semibold text-white group-hover:text-cyan-200 transition-colors leading-tight">
            Welcome, {displayName}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase ${roleBadge.className}`}>
              {roleBadge.label}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Profile Dropdown Menu */}
      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed sm:absolute left-0 right-0 sm:left-auto sm:right-0 top-16 sm:top-full mt-1 sm:mt-2 mx-auto sm:mx-0 w-[92vw] max-w-[92vw] sm:w-80 sm:max-w-md origin-top sm:origin-top-right rounded-2xl bg-[#0b0f17] border border-white/10 p-3 sm:p-3.5 shadow-2xl z-[100] space-y-2 text-xs font-sans backdrop-blur-xl ring-1 ring-white/5 overflow-y-auto max-h-[85vh]"
          >
            {/* Header info */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1 overflow-hidden">
              <div className="font-bold text-white text-xs truncate">
                {profile?.full_name || displayName}
              </div>
              <div className="text-[10px] font-mono text-white/50 truncate">
                {profile?.email || user?.email}
              </div>
              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0 ${roleBadge.className}`}>
                  ROLE: {roleBadge.label}
                </span>
                {profile?.is_pioneer !== false && (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded font-extrabold uppercase bg-amber-400 text-black shadow-[0_0_8px_rgba(245,158,11,0.5)] shrink-0">
                    [PIONEER-2027]
                  </span>
                )}
                {profile?.vip_code_redeemed && (
                  <span className="text-[9px] font-mono text-emerald-400 font-semibold truncate shrink-0">
                    #{profile.vip_code_redeemed}
                  </span>
                )}
              </div>
              {profile?.claimed_sector && (
                <div className="text-[9.5px] font-mono text-cyan-300 pt-0.5 truncate">
                  🪐 WORLD: {profile.claimed_sector}
                </div>
              )}

              {/* Strict Account-Bound VIP Pass Badge */}
              {isUserVip && (
                <div
                  aria-label="VIP PASS UNLOCKED — STRICTLY BOUND TO THIS ACCOUNT"
                  className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/90 via-teal-950/85 to-emerald-950/90 border border-emerald-500/60 text-emerald-300 font-mono text-[9px] sm:text-[9.5px] font-bold flex items-center gap-2 shadow-[0_0_14px_rgba(16,185,129,0.3)] select-none overflow-hidden"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="leading-tight flex flex-col min-w-0 flex-1">
                    <span className="font-extrabold text-emerald-200 uppercase tracking-wide truncate">
                      VIP PASS UNLOCKED — STRICTLY BOUND TO THIS ACCOUNT
                    </span>
                    <span className="text-[8.5px] text-emerald-400/80 font-normal truncate">
                      PERMANENT ACCOUNT BINDING VERIFIED
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Role Entitlement Info */}
            <div className="px-2 py-1 text-[10px] font-mono text-white/60 space-y-1">
              {isUserVip && (isSubscriber || role === 'ANNUAL_PASS' || role === 'SUBSCRIBER') ? (
                <div className="text-amber-300 font-semibold">✨👑 Dual-Tier: All VIP Channels + Full Asset Vault Unlocked</div>
              ) : (
                <>
                  {!isUserVip && role === 'FREE' && <div>🔓 Public Chat Access (Free)</div>}
                  {!isUserVip && role === 'GUEST' && <div>🔓 Guest Explorer</div>}
                  {isUserVip && <div>✨ 1-of-100 VIP Guest: All Chat Channels Unlocked</div>}
                  {(role === 'ANNUAL_PASS' || role === 'SUBSCRIBER' || isSubscriber) && <div>👑 Full Access + Asset Downloads Unlocked</div>}
                  {role === 'CREATOR' && <div>👑 Syndicate Founder Privileges</div>}
                </>
              )}
            </div>

            {/* Direct Claim Your Free World Modal Trigger */}
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                openClaimWorldModal();
              }}
              className="w-full p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-950/60 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-between min-h-[48px]"
            >
              <span className="flex items-center gap-2">
                <Globe2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Claim Your Free World</span>
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400 text-black font-extrabold uppercase shrink-0">
                [PIONEER-2027]
              </span>
            </button>



            {/* Quick Link to Community Hub */}
            <a
              href="/community"
              className="w-full p-2.5 rounded-xl hover:bg-white/5 text-white/80 hover:text-white font-mono text-[11px] transition-colors cursor-pointer flex items-center justify-between min-h-[48px]"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Community Hub</span>
              </span>
              <ExternalLink className="w-3 h-3 text-white/40" />
            </a>

            {/* Sign Out */}
            <button
              type="button"
              onClick={async () => {
                setIsDropdownOpen(false);
                await signOut();
              }}
              className="w-full p-2.5 rounded-xl hover:bg-red-950/30 text-red-300 font-mono text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-2 min-h-[48px]"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Sign Out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
