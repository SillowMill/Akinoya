import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import { PlanetSubmission } from '../types/contest';
import { isLiveGalaxyWorld } from '../data/contest';
import { triggerMemberPassCheckout } from '../utils/pioneer';

interface WorldReleaseStatusBannerProps {
  dossier: PlanetSubmission;
  className?: string;
}

/**
 * Release status banner for newly synthesized user worlds.
 * Rendered above the generated media in My World & My Assets.
 * Communicates the Pending Activation state and Member Pass activation flow.
 * Strictly excludes the initial 5 Pioneer Worlds.
 */
export const WorldReleaseStatusBanner: React.FC<WorldReleaseStatusBannerProps> = ({ dossier, className = '' }) => {
  if (!dossier || isLiveGalaxyWorld(dossier)) {
    return null;
  }

  return (
    <div
      role="status"
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b1730]/95 via-[#070d1d]/95 to-[#1a1206]/95 border-2 border-amber-400/60 p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.7),0_0_30px_rgba(245,158,11,0.22)] ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300 via-cyan-400 to-transparent pointer-events-none" />
      {/* Subtle sweeping sheen */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none"
        animate={{ left: ['-35%', '110%'] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(245,158,11,0.35)]">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>

          <div className="space-y-1 text-left min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-300/70 text-[10px] sm:text-[10.5px] font-mono font-extrabold tracking-widest uppercase text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                PENDING ACTIVATION
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-[10px] sm:text-[10.5px] font-mono font-bold tracking-wider uppercase text-cyan-200">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>VAULT SECURED</span>
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-display font-black text-white tracking-wide">
              Your world is synthesized!
            </h3>
            <p className="text-[11.5px] sm:text-xs text-cyan-100/80 font-sans leading-relaxed max-w-2xl">
              To activate your planet on the live Galaxy Navigator, unlock full 4K visuals, and secure your official co-creation collaboration with Mill, upgrade to the Annual Member Pass.
            </p>
          </div>
        </div>

        <div className="shrink-0 pt-1 md:pt-0">
          <button
            type="button"
            onClick={triggerMemberPassCheckout}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-extrabold text-xs shadow-[0_0_25px_rgba(245,158,11,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] active:scale-[0.98]"
          >
            <Zap className="w-3.5 h-3.5 fill-black text-black" />
            <span>Activate World &amp; Join Member Pass</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorldReleaseStatusBanner;
