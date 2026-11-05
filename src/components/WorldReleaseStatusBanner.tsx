import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ShieldCheck, ArrowRight, Zap, Calendar, CheckCircle2 } from 'lucide-react';
import { PlanetSubmission } from '../types/contest';
import { isLiveGalaxyWorld } from '../data/contest';
import { triggerMemberPassCheckout, triggerWorldPassCheckout, hasWorldSynthesisPass } from '../utils/pioneer';
import { useAuth } from '../context/AuthContext';

interface WorldReleaseStatusBannerProps {
  dossier: PlanetSubmission;
  className?: string;
}

/**
 * Release status banner for newly synthesized user worlds.
 * Rendered above the generated media in My World & My Assets.
 * Communicates the Monday Batch Update Schedule, co-creation reassurance,
 * and World Pass / Member Pass activation flow. Strictly excludes the initial 5 Pioneer Worlds.
 */
export const WorldReleaseStatusBanner: React.FC<WorldReleaseStatusBannerProps> = ({ dossier, className = '' }) => {
  const { user, profile, role, isVip } = useAuth();
  const hasPass = hasWorldSynthesisPass(user, profile, role, isVip);

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

          <div className="space-y-1.5 text-left min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-300/70 text-[10px] sm:text-[10.5px] font-mono font-extrabold tracking-widest uppercase text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {hasPass ? '✓ WORLD VERIFIED & QUEUED' : '· PENDING ACTIVATION · UNPAID DRAFT'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-[10px] sm:text-[10.5px] font-mono font-bold tracking-wider uppercase text-cyan-200">
                <Calendar className="w-3 h-3 text-cyan-400" />
                <span>UPDATED EVERY MONDAY MORNING</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-[10px] sm:text-[10.5px] font-mono font-bold tracking-wider uppercase text-emerald-300">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>VAULT SECURED</span>
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-display font-black text-white tracking-wide">
              {hasPass
                ? 'World Verified & Queued for Deployment'
                : 'Activate Your World & Secure Visualizer Co-Creation'}
            </h3>

            <p className="text-[11.5px] sm:text-xs text-amber-100/90 font-sans leading-relaxed max-w-2xl font-medium">
              {hasPass
                ? 'Your planetary specs and visualizer feature slot are locked. Your world will be processed and deployed to the live Galaxy Navigator during the upcoming Monday morning cluster update.'
                : 'The Galaxy Navigator is updated every Monday morning with new custom sector batches. Your draft planetary specs are stored in your Vault. Activate with the €14.99 World Pass to process full 4K renders, lock your official co-creation spot in a future cinematic visualizer, and queue your world for the upcoming Monday deployment.'}
            </p>
          </div>
        </div>

        <div className="shrink-0 pt-1 md:pt-0">
          {hasPass ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/80 border border-emerald-400/60 text-emerald-300 font-mono text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Queued for Monday Batch ✓</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={() => triggerWorldPassCheckout(dossier?.planetName)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono font-extrabold text-xs shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Buy €14.99 World Pass to Activate →</span>
              </button>
              <button
                type="button"
                onClick={triggerMemberPassCheckout}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono font-bold text-xs transition-all cursor-pointer flex items-center justify-center min-h-[44px]"
              >
                <span>Unlock via Member Pass →</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorldReleaseStatusBanner;
