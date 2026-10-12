import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  LogOut,
  KeyRound,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Crown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../utils/audio';

export const AuthHeaderButton: React.FC = () => {
  const { user, profile, role, isAuthenticated, isVip, isSubscriber, openAuthModal, signOut } = useAuth();
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

  const getRoleBadge = () => {
    if (role === 'CREATOR') {
      return {
        label: 'CREATOR',
        className: 'bg-amber-500 text-black font-black border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]',
      };
    }
    if ((isVip || role === 'VIP_GUEST') && (isSubscriber || role === 'ANNUAL_PASS' || role === 'SUBSCRIBER')) {
      return {
        label: 'VIP + SUBSCRIBER',
        className: 'bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 text-black font-black border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]',
      };
    }
    if (role === 'ANNUAL_PASS' || role === 'SUBSCRIBER' || isSubscriber) {
      return {
        label: 'ANNUAL PASS',
        className: 'bg-amber-500/25 text-amber-300 border border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]',
      };
    }
    if (role === 'VIP_GUEST' || isVip) {
      return {
        label: 'VIP GUEST',
        className: 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]',
      };
    }
    if (role === 'GUEST') {
      return {
        label: 'GUEST',
        className: 'bg-cyan-900/60 text-cyan-200 border border-cyan-400/30',
      };
    }
    return {
      label: 'FREE',
      className: 'bg-cyan-950/80 text-cyan-300 border border-cyan-400/30',
    };
  };

  const roleBadge = getRoleBadge();
  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'Pilot';

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal('signin')}
        className="min-h-[48px] px-2.5 xs:px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-black font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.35)] hover:scale-[1.02] active:scale-[0.98] shrink-0"
      >
        <User className="w-3.5 h-3.5 fill-black shrink-0" />
        <span>SIGN IN<span className="hidden sm:inline"> / REGISTER</span></span>
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
            className="absolute right-0 top-full mt-2 w-64 sm:w-72 rounded-2xl bg-[#0b0f17] border border-white/10 p-3 shadow-2xl z-[100] space-y-2 text-xs font-sans backdrop-blur-xl ring-1 ring-white/5"
          >
            {/* Header info */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
              <div className="font-bold text-white text-xs truncate">
                {profile?.full_name || displayName}
              </div>
              <div className="text-[10px] font-mono text-white/50 truncate">
                {profile?.email || user?.email}
              </div>
              <div className="pt-1 flex items-center gap-1.5">
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${roleBadge.className}`}>
                  ROLE: {roleBadge.label}
                </span>
                {profile?.vip_code_redeemed && (
                  <span className="text-[9px] font-mono text-emerald-400 font-semibold truncate">
                    #{profile.vip_code_redeemed}
                  </span>
                )}
              </div>
            </div>

            {/* Role Entitlement Info */}
            <div className="px-2 py-1 text-[10px] font-mono text-white/60 space-y-1">
              {(isVip || role === 'VIP_GUEST') && (isSubscriber || role === 'ANNUAL_PASS' || role === 'SUBSCRIBER') ? (
                <div className="text-amber-300 font-semibold">✨👑 Dual-Tier: All VIP Channels + Full Asset Vault Unlocked</div>
              ) : (
                <>
                  {role === 'FREE' && <div>🔓 Public Chat Access (Free)</div>}
                  {role === 'GUEST' && <div>🔓 Guest Explorer</div>}
                  {(role === 'VIP_GUEST' || isVip) && <div>✨ 1-of-100 Guest: All Chat Channels Unlocked</div>}
                  {(role === 'ANNUAL_PASS' || role === 'SUBSCRIBER' || isSubscriber) && <div>👑 Full Access + Asset Downloads Unlocked</div>}
                  {role === 'CREATOR' && <div>👑 Syndicate Founder Privileges</div>}
                </>
              )}
            </div>

            {/* Verify & Redeem VIP Pass Portal action if user does not have a VIP pass */}
            {!isVip && role !== 'VIP_GUEST' && role !== 'CREATOR' && (
              <a
                href="/verify"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-950/60 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-2 text-left min-h-[48px]"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Verify &amp; Redeem VIP Pass</span>
              </a>
            )}

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
              onClick={() => {
                setIsDropdownOpen(false);
                signOut();
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
