import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Globe2, Layers, Trees, Compass, ShieldCheck, Cpu, Terminal } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface AkinoyaSciFiLoaderProps {
  planetName?: string;
  progress?: number;
  stageName?: string;
  stageDetails?: string;
  slotIndex?: number;
  totalSlots?: number;
  onComplete?: () => void;
}

interface TelemetryStage {
  threshold: number;
  stageName: string;
  details: string;
  icon: React.ElementType;
}

const TELEMETRY_STAGES: TelemetryStage[] = [
  {
    threshold: 0,
    stageName: 'GENERATING ORBITAL HERO (1/5)...',
    details: 'Synthesizing planetary sphere, atmospheric corona, and deep space horizon via Google Gemini Imagen 3...',
    icon: Globe2,
  },
  {
    threshold: 20,
    stageName: 'RENDERING BOTANICAL FLORA (2/5)...',
    details: 'Synthesizing bioluminescent alien vegetation, spore towers, and botanical ecology...',
    icon: Trees,
  },
  {
    threshold: 40,
    stageName: 'PAINTING EXOTIC FAUNA (3/5)...',
    details: 'Synthesizing xenobiological wildlife, soaring pack lifeforms, and planetary creatures...',
    icon: Compass,
  },
  {
    threshold: 60,
    stageName: 'SIMULATING COCKPIT ATMOSPHERE (4/5)...',
    details: 'Framing cockpit descent canopy, pilot HUD vector reflections, and atmospheric cloud density...',
    icon: Layers,
  },
  {
    threshold: 80,
    stageName: 'INSCRIBING LORE MONUMENT (5/5)...',
    details: 'Erecting monumental architectural landmark and sealing official lore dossier cover...',
    icon: ShieldCheck,
  },
];

export const AkinoyaSciFiLoader: React.FC<AkinoyaSciFiLoaderProps> = ({
  planetName = 'Äkinoya Frontier Sector',
  progress: externalProgress,
  stageName: externalStageName,
  stageDetails: externalStageDetails,
  slotIndex: externalSlotIndex,
  totalSlots = 5,
  onComplete,
}) => {
  const [internalProgress, setInternalProgress] = useState<number>(0);
  const isControlled = externalProgress !== undefined;
  const progress = isControlled ? externalProgress : internalProgress;

  useEffect(() => {
    if (isControlled) return;
    soundManager.playTone(550, 0.08);

    const interval = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (onComplete) onComplete();
          return 100;
        }
        const increment = prev < 30 ? 2.5 : prev < 70 ? 1.8 : prev < 90 ? 1.2 : 0.8;
        const next = Math.min(100, Math.round((prev + increment) * 10) / 10);

        if (Math.floor(next) % 20 === 0 && Math.floor(prev) !== Math.floor(next)) {
          soundManager.playTone(600 + (next * 2), 0.03);
        }

        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [isControlled, onComplete]);

  // Determine current active telemetry stage
  const defaultStage =
    [...TELEMETRY_STAGES].reverse().find((s) => progress >= s.threshold) || TELEMETRY_STAGES[0];
  const activeStageName = externalStageName || defaultStage.stageName;
  const activeStageDetails = externalStageDetails || defaultStage.details;
  const Icon = defaultStage.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl overflow-hidden">
      {/* Background Holographic Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="w-[350px] h-[350px] bg-purple-500/10 rounded-full blur-[90px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-xl rounded-3xl bg-[#050813] border-2 border-cyan-500/40 p-6 sm:p-8 shadow-[0_0_80px_rgba(6,182,212,0.25)] space-y-6"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-400/40 text-cyan-300">
              <Cpu className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                GOOGLE GEMINI · IMAGEN 3 LIVE AI SYNTHESIZER
              </span>
              <h2 className="text-base sm:text-lg font-display font-extrabold text-white tracking-wide truncate">
                {planetName}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-amber-300">
              {Math.min(100, Math.floor(progress))}%
            </span>
          </div>
        </div>

        {/* Central Holographic Visualizer */}
        <div className="relative h-40 sm:h-48 rounded-2xl bg-black/80 border border-cyan-500/30 overflow-hidden flex flex-col items-center justify-center p-6 text-center space-y-3">
          {/* Radar Scanline */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(34,211,238,0.12)_50%,transparent_100%)] bg-[length:100%_40px] animate-pulse pointer-events-none" />

          {/* Central Orbit Ring */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-cyan-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.3)]">
            <div className="absolute inset-0 rounded-full border border-dashed border-amber-400/50 animate-spin" style={{ animationDuration: '8s' }} />
            <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-300 animate-pulse" />
          </div>

          <div className="space-y-1 relative z-10 max-w-md">
            <div className="text-xs sm:text-sm font-mono font-bold text-cyan-300 tracking-wider">
              {activeStageName}
            </div>
            <p className="text-[11px] font-mono text-white/60 line-clamp-2">
              {activeStageDetails}
            </p>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-black/80 rounded-full overflow-hidden border border-white/10 p-0.5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-400 shadow-[0_0_15px_rgba(56,189,248,0.8)]"
              style={{ width: `${Math.min(100, progress)}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>

          <div className="flex items-center justify-between text-[9.5px] font-mono text-white/40">
            <span className={progress >= 20 ? 'text-cyan-300 font-bold' : ''}>01 · ORBITAL</span>
            <span className={progress >= 40 ? 'text-cyan-300 font-bold' : ''}>02 · FLORA</span>
            <span className={progress >= 60 ? 'text-cyan-300 font-bold' : ''}>03 · FAUNA</span>
            <span className={progress >= 80 ? 'text-cyan-300 font-bold' : ''}>04 · COCKPIT</span>
            <span className={progress >= 100 ? 'text-amber-300 font-bold' : ''}>05 · MONUMENT</span>
          </div>
        </div>

        {/* Sci-Fi Telemetry Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-[10px] font-mono">
          <div className="bg-white/5 rounded-xl p-2 border border-white/5">
            <span className="text-white/40 block">COORDINATES</span>
            <span className="text-cyan-300 font-semibold truncate block">RA 04h 35m</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2 border border-white/5">
            <span className="text-white/40 block">COMPOSITION</span>
            <span className="text-cyan-300 font-semibold truncate block">akinoya_hero_bg.jpg</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2 border border-white/5">
            <span className="text-white/40 block">ATMOSPHERE</span>
            <span className="text-cyan-300 font-semibold truncate block">Mood.png Panel</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2 border border-white/5">
            <span className="text-white/40 block">SECURITY</span>
            <span className="text-amber-300 font-semibold truncate block">ONE-SHOT LOCK</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
