/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Globe2,
  Sparkles,
  Lock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  X,
  Compass,
  Layers,
  Crown,
  KeyRound,
  Download,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import {
  PIONEER_BADGE_TAG,
  calculateLaunchCountdown,
  CountdownTime,
  getStoredSectorClaim,
  saveSectorClaim,
  SectorClaimRecord,
  isPostLaunch,
  hasPaidMembership,
  openMembershipGateModal,
} from '../utils/pioneer';
import { formatAkinoyaPlanetName } from '../data/contest';
import { useAuth } from '../context/AuthContext';

export interface ClaimYourWorldModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNavigateToContest?: () => void;
}

const BIOME_OPTIONS = [
  { id: 'bioluminescent', label: '🌿 Bioluminescent Canopy (Äkinoya Native)', prefix: 'BIO' },
  { id: 'orbital', label: '🌌 Deep Orbital Relay Station', prefix: 'ORB' },
  { id: 'volcanic', label: '🌋 Basalt Volcanic Rift Basin', prefix: 'VOL' },
  { id: 'cryo', label: '🧊 Sub-Zero Cryo Glade Frontier', prefix: 'CRY' },
  { id: 'gasring', label: '🪐 Atmospheric Gas Ring Siphon', prefix: 'ATM' },
];

export const ClaimYourWorldModal: React.FC<ClaimYourWorldModalProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onNavigateToContest,
}) => {
  const { user, profile, isAuthenticated, openAuthModal, role, isVip } = useAuth();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const [countdown, setCountdown] = useState<CountdownTime>(calculateLaunchCountdown);
  const [sectorName, setSectorName] = useState('');
  const [selectedBiome, setSelectedBiome] = useState(BIOME_OPTIONS[0]);
  const [visitorEmail, setVisitorEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedClaim, setConfirmedClaim] = useState<SectorClaimRecord | null>(getStoredSectorClaim);

  // Listen for global open events
  useEffect(() => {
    const handleGlobalOpen = () => {
      setInternalIsOpen(true);
      soundManager.playTone(520, 0.05);
    };

    window.addEventListener('akinoya-open-claim-world', handleGlobalOpen);
    return () => window.removeEventListener('akinoya-open-claim-world', handleGlobalOpen);
  }, []);

  // Update countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateLaunchCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync visitor email from auth state
  useEffect(() => {
    if (user?.email) {
      setVisitorEmail(user.email);
    }
  }, [user]);

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
    setErrorMessage('');
  };

  const coordinates = `RA 04h 35m / +16° 30' · ${selectedBiome.prefix}-${Math.abs(
    sectorName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 104)
  ) % 9000 + 1000}-A`;

  const handleStartWorldbuilding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (isPostLaunch() && !hasPaidMembership(user, profile, role, isVip)) {
      handleClose();
      openMembershipGateModal();
      return;
    }

    const trimmedSectorName = sectorName.trim();
    if (!trimmedSectorName) {
      setErrorMessage('Please enter the name of your planet to begin worldbuilding.');
      soundManager.playError();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const emailToUse = (user?.email || visitorEmail || '').trim().toLowerCase();
    const cleanPlanetName = formatAkinoyaPlanetName(trimmedSectorName, false) || trimmedSectorName;

    const claimRecord: SectorClaimRecord = {
      sectorName: cleanPlanetName,
      biome: selectedBiome.label,
      coordinates,
      claimedAt: new Date().toISOString(),
      pioneerBadge: PIONEER_BADGE_TAG,
      holderEmail: emailToUse,
    };
    saveSectorClaim(claimRecord);
    setConfirmedClaim(claimRecord);

    // Direct Sync to Google Sheets if email is present
    if (emailToUse) {
      const syncPayload = {
        first_name: profile?.first_name || user?.user_metadata?.first_name || emailToUse.split('@')[0],
        last_name: profile?.last_name || user?.user_metadata?.last_name || '',
        email: emailToUse,
        role: role || (isVip ? 'VIP_GUEST' : 'FREE'),
        claimed_sector: `${cleanPlanetName} (${selectedBiome.label})`,
        is_pioneer: true,
        pioneer_badge: PIONEER_BADGE_TAG,
        created_at: profile?.created_at || new Date().toISOString(),
      };

      fetch('/api/auth/sync-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncPayload),
      }).catch((err) => console.warn('[Pioneer Modal] Sheets sync notice:', err));
    }

    // Auto-advance Mill directly to Question 2 with user's planet inputs
    sessionStorage.setItem('akinoya_start_mill', 'true');
    sessionStorage.setItem('akinoya_mill_start_step', '2');
    window.dispatchEvent(
      new CustomEvent('akinoya-start-mill', {
        detail: {
          planetName: cleanPlanetName,
          biome: selectedBiome.label,
          initialStep: 2,
        },
      })
    );

    soundManager.playTone(660, 0.08);
    setIsSubmitting(false);
    handleClose();
    if (onNavigateToContest) {
      onNavigateToContest();
    } else {
      try {
        window.history.pushState({}, '', '/contest');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {
        // Fallback
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuth = () => {
    handleClose();
    openAuthModal('signup');
  };

  if (!isModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
        {/* Backdrop click to dismiss */}
        <div className="fixed inset-0 pointer-events-auto" onClick={handleClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-2xl w-full bg-[#050812]/95 border border-white/15 rounded-3xl p-5 sm:p-8 backdrop-blur-2xl shadow-[0_0_60px_rgba(245,158,11,0.25)] overflow-hidden my-auto"
        >
          {/* Subtle Ambient Gold Accents */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer z-20"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {!claimSuccess ? (
            <div className="relative z-10 space-y-6">
              {/* Header: Pioneer Badge & Official Launch Target */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-400/60 text-amber-300 font-mono text-[10.5px] sm:text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>[PIONEER-2027] EARLY ACCESS WHITELIST</span>
                  </span>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-400/30 text-cyan-300 tracking-wider font-semibold">
                    OFFICIAL LAUNCH: JAN 9, 2027
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight uppercase">
                  Create Your Free World
                </h2>

                <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                  Official Launch: <span className="text-amber-300 font-semibold">January 9, 2027</span>. <strong className="text-amber-300 font-semibold">Create your free world before 09/01/2027</strong> to unlock planetary sector claims, full community channels, and permanent Pioneer status.
                </p>
              </div>

              {/* Exclusivity & FOMO Explainer Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#090e1e]/90 border border-amber-500/30 space-y-3 shadow-inner">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                    <Lock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="space-y-1 text-xs font-sans">
                    <span className="font-mono font-bold text-amber-300 block text-[11px] uppercase tracking-wider">
                      Membership-Gated Exclusivity
                    </span>
                    <p className="text-white/80 leading-relaxed">
                      Custom planetary sector claims, official Worldbuilding Contest entry, and the opportunity to be featured in the official Sillow Mill visualizer releases with Odi Selis require an active membership. All accounts registered during this pre-launch phase receive irrevocable <strong className="text-amber-300">[PIONEER-2027]</strong> status.
                    </p>
                  </div>
                </div>

                {/* 4 Core Pioneer Benefits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px] font-mono text-white/80">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Sovereign Sector Reservation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Permanent [PIONEER-2027] Tag</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Worldbuilding Contest Priority</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span>Visualizer Feature with Odi Selis</span>
                  </div>
                </div>
              </div>

              {/* Interactive Sector Claim Generator Form */}
              <form onSubmit={handleStartWorldbuilding} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Planet Name Designation */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-mono uppercase text-white/60 tracking-wider">
                      Planet Name
                    </label>
                    <input
                      type="text"
                      value={sectorName}
                      onChange={(e) => setSectorName(e.target.value)}
                      placeholder="Name of your planet..."
                      maxLength={40}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-amber-400 text-white font-mono text-xs focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  {/* Biome Selector */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-mono uppercase text-white/60 tracking-wider">
                      Planetary Biome / Terrain
                    </label>
                    <select
                      value={selectedBiome.id}
                      onChange={(e) => {
                        const match = BIOME_OPTIONS.find((b) => b.id === e.target.value);
                        if (match) setSelectedBiome(match);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-amber-400 text-white font-sans text-xs focus:outline-none transition-colors cursor-pointer"
                    >
                      {BIOME_OPTIONS.map((b) => (
                        <option key={b.id} value={b.id} className="bg-[#050812] text-white">
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Sector Celestial Coordinates Preview */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs font-mono text-white/70">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Sector Coordinates:</span>
                  </div>
                  <span className="font-bold text-cyan-300 truncate ml-2">{coordinates}</span>
                </div>

                {/* Email input for unauthenticated visitors */}
                {!isAuthenticated && (
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono uppercase text-white/60 tracking-wider">
                        Holder Email Address
                      </label>
                      <span className="text-[10px] font-mono text-amber-400">Pioneer Whitelist Binding</span>
                    </div>
                    <input
                      type="email"
                      value={visitorEmail}
                      onChange={(e) => setVisitorEmail(e.target.value)}
                      placeholder="your.email@domain.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-amber-400 text-white font-mono text-xs focus:outline-none transition-colors"
                      required
                    />
                  </div>
                )}

                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Single Clear Action Button: Worldbuild with Mill */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-950/90 via-[#0a1b2a] to-amber-950/80 hover:from-cyan-900 hover:to-amber-900 border-2 border-cyan-400/60 hover:border-amber-400 text-cyan-300 hover:text-white font-mono font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(245,158,11,0.45)] active:scale-[0.99] disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                    <span>
                      {isSubmitting ? 'INITIALIZING MILL (QUESTION 02)...' : 'WORLDBUILD WITH MILL →'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Paid Membership Pre-Order Prompt */}
              <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-white/60">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Countdown to Jan 9, 2027: [ {countdown.days}D : {countdown.hours}H : {countdown.minutes}M : {countdown.seconds}S ]
                  </span>
                </div>
                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={handleOpenAuth}
                    className="text-cyan-300 hover:text-white underline transition-colors cursor-pointer"
                  >
                    Already have a pass or account? Sign In →
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* SUCCESS CONFIRMATION DOSSIER VIEW                        */
            /* ======================================================== */
            <div className="relative z-10 text-center space-y-6 py-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-black flex items-center justify-center mx-auto shadow-[0_0_35px_rgba(245,158,11,0.6)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-400 text-amber-300 font-mono text-xs font-bold tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>[PIONEER-2027] SECTOR RESERVED &amp; WHITELISTED</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-display font-black text-white">
                  Sector Claim Confirmed
                </h3>
                <p className="text-xs sm:text-sm text-white/70 font-sans max-w-md mx-auto">
                  Your coordinates have been registered to the Äkinoya master registry and synced to Google Sheets.
                </p>
              </div>

              {/* Dossier Card */}
              {confirmedClaim && (
                <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-amber-500/40 text-left font-mono space-y-2.5 max-w-md mx-auto shadow-inner text-xs">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="text-white/50">PLANET NAME:</span>
                    <span className="text-amber-300 font-bold">{confirmedClaim.sectorName}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="text-white/50">PLANETARY BIOME:</span>
                    <span className="text-white/80">{confirmedClaim.biome}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="text-white/50">COORDINATES:</span>
                    <span className="text-cyan-300 font-bold">{confirmedClaim.coordinates}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="text-white/50">PIONEER STATUS:</span>
                    <span className="text-amber-400 font-bold">[PIONEER-2027] ACTIVE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/50">OFFICIAL RELEASE:</span>
                    <span className="text-white font-bold">JANUARY 9, 2027</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartWorldbuilding}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Continue to Question 2 with Mill →</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono font-bold text-xs transition-colors cursor-pointer"
                >
                  Return to Exploration
                </button>

                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={handleOpenAuth}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-300 font-mono font-bold text-xs transition-colors cursor-pointer"
                  >
                    Complete Account Sign-Up →
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
