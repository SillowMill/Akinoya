import React from 'react';
import { motion } from 'motion/react';
import { CalendarClock, Film, IdCard, Image as ImageIcon, Lock, Radar, Sparkles } from 'lucide-react';
import { PlanetSubmission } from '../types/contest';
import { formatTitleCaseUserName } from '../utils/holder';
import {
  WORLD_QUEUE_OFFICIAL_MESSAGE,
  WORLD_QUEUE_STATUS_LABEL,
  WORLD_RELEASE_DATE_LABEL,
} from '../data/contest';

interface WorldGenerationQueueStateProps {
  dossier: PlanetSubmission;
  /** 'world' renders inside My World, 'assets' inside My Assets (adds the locked media slots). */
  variant?: 'world' | 'assets';
  holderName?: string | null;
}

const QUEUED_MEDIA_SLOTS = [
  { key: 'trailer', label: '9:16 MP4 Trailer Loop', icon: Film },
  { key: 'story', label: 'Story Verification Card', icon: IdCard },
  { key: 'archive', label: '4K Planetary Archive', icon: ImageIcon },
];

/**
 * High-end cosmic processing scanner shown in place of media downloads/previews
 * for newly queued (non-benchmark) worlds until the January 9, 2027 release.
 */
export const WorldGenerationQueueState: React.FC<WorldGenerationQueueStateProps> = ({
  dossier,
  variant = 'world',
  holderName,
}) => {
  const displayHolder = formatTitleCaseUserName(holderName || dossier.authorName || 'Pioneer');
  const sectorToken = dossier.sectorId || 'SECTOR PENDING';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0a132c]/95 via-[#060c1d]/95 to-[#040814]/98 backdrop-blur-2xl border-2 border-amber-400/40 p-5 sm:p-7 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(245,158,11,0.18)]">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent pointer-events-none" />
      <div className="absolute -top-28 -right-28 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -left-28 w-96 h-96 bg-cyan-500/12 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center gap-6">
        {/* Status Banner */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-300/60 shadow-[0_0_18px_rgba(245,158,11,0.3)]">
          <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
          <span className="text-[10px] sm:text-[11px] font-mono font-extrabold tracking-widest text-amber-200 uppercase">
            Status: {WORLD_QUEUE_STATUS_LABEL}
          </span>
        </div>

        {/* Cosmic Scanner Animation */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center" aria-hidden="true">
          {/* Outer dashed orbit */}
          <motion.div
            className="absolute inset-0 rounded-full border border-dashed border-cyan-400/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          />
          {/* Middle orbit with satellite */}
          <motion.div
            className="absolute inset-5 rounded-full border border-amber-300/40"
            animate={{ rotate: -360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          >
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_#fbbf24]" />
          </motion.div>
          {/* Radar sweep */}
          <motion.div
            className="absolute inset-9 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(56,189,248,0) 0deg, rgba(56,189,248,0) 280deg, rgba(56,189,248,0.55) 360deg)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
          />
          {/* Pulsing proto-planet core */}
          <motion.div
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-cyan-300/40 via-indigo-500/40 to-amber-400/40 border-2 border-amber-300/70 shadow-[0_0_40px_rgba(245,158,11,0.45),inset_0_0_25px_rgba(56,189,248,0.5)] overflow-hidden"
            animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Vertical scan line */}
            <motion.div
              className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-200 to-transparent shadow-[0_0_12px_rgba(165,243,252,0.9)]"
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
          <Radar className="absolute w-6 h-6 text-cyan-200/80" />
        </div>

        {/* World Identity */}
        <div className="space-y-2">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-white tracking-widest uppercase drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)]">
            {dossier.planetName}
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 font-mono text-[10.5px] sm:text-xs font-extrabold tracking-widest uppercase">
              {sectorToken}
            </span>
            <span className="text-xs sm:text-sm font-mono text-white/75">
              Holder: <strong className="text-amber-300 font-bold">{displayHolder}</strong>
            </span>
          </div>
        </div>

        {/* Release target + official message */}
        <div className="w-full max-w-xl rounded-2xl bg-black/40 border border-white/10 p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs font-mono font-bold tracking-widest uppercase text-cyan-200">
            <CalendarClock className="w-4 h-4 text-cyan-300 shrink-0" />
            <span>Release Target: {WORLD_RELEASE_DATE_LABEL}</span>
          </div>
          <p className="text-xs sm:text-sm text-white/85 font-sans italic leading-relaxed">
            &ldquo;{WORLD_QUEUE_OFFICIAL_MESSAGE}&rdquo;
          </p>
          {/* Indeterminate processing bar */}
          <div className="relative h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-transparent"
              animate={{ left: ['-35%', '100%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>

        {/* Locked media slots (My Assets) */}
        {variant === 'assets' && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
            {QUEUED_MEDIA_SLOTS.map(({ key, label, icon: Icon }, i) => (
              <div
                key={key}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4 flex flex-col items-center gap-2"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                />
                <Icon className="w-5 h-5 text-cyan-300/80" />
                <span className="text-[11px] font-mono font-bold text-white/80 uppercase tracking-wider">{label}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300/90">
                  <Lock className="w-3 h-3" /> Processing · {WORLD_RELEASE_DATE_LABEL}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/45">
          <Sparkles className="w-3 h-3 text-amber-300/70" />
          <span>Private to your dashboard until release · Not yet listed on the public Galaxy Navigator</span>
        </div>
      </div>
    </div>
  );
};

export default WorldGenerationQueueState;
