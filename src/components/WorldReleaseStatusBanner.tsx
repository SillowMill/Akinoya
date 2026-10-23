import React from 'react';
import { motion } from 'motion/react';
import { CalendarClock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { PlanetSubmission } from '../types/contest';
import {
  WORLD_QUEUE_OFFICIAL_MESSAGE,
  WORLD_QUEUE_STATUS_LABEL,
  WORLD_RELEASE_DATE_LABEL,
} from '../data/contest';

interface WorldReleaseStatusBannerProps {
  dossier: PlanetSubmission;
  className?: string;
}

/**
 * Release status banner for newly synthesized user worlds.
 * Rendered above the fully generated media (5-photo dossier, story card, 9:16 trailer)
 * in My World & My Assets. The world stays private to the dashboard until the
 * January 9, 2027 release / admin review.
 */
export const WorldReleaseStatusBanner: React.FC<WorldReleaseStatusBannerProps> = ({ dossier, className = '' }) => {
  return (
    <div
      role="status"
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b1730]/95 via-[#070d1d]/95 to-[#1a1206]/95 border border-amber-400/50 p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_25px_rgba(245,158,11,0.18)] ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent pointer-events-none" />
      {/* Subtle sweeping sheen */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent pointer-events-none"
        animate={{ left: ['-35%', '110%'] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
        <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-400/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)] mx-auto md:mx-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-300/60 text-[10px] sm:text-[10.5px] font-mono font-extrabold tracking-widest uppercase text-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
              Status: {WORLD_QUEUE_STATUS_LABEL}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-[10px] sm:text-[10.5px] font-mono font-extrabold tracking-widest uppercase text-cyan-200">
              <CalendarClock className="w-3 h-3 text-cyan-300" />
              Release Target: {WORLD_RELEASE_DATE_LABEL}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/85 font-sans italic leading-relaxed">
            &ldquo;{WORLD_QUEUE_OFFICIAL_MESSAGE}&rdquo;
          </p>
          <p className="flex items-center justify-center md:justify-start gap-1.5 text-[10px] font-mono text-white/45">
            <ShieldCheck className="w-3 h-3 text-emerald-300/70 shrink-0" />
            <span>
              {dossier.planetName}
              {dossier.sectorId ? ` · ${dossier.sectorId}` : ''} · Private to your dashboard until release
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorldReleaseStatusBanner;
