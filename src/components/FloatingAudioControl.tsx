import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Pause, Play, Music, Square } from 'lucide-react';
import { planetSoundtrack } from '../utils/soundtrack';

export const FloatingAudioControl: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = planetSoundtrack.subscribe((playing) => {
      setIsPlaying(playing);
    });
    return unsubscribe;
  }, []);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await planetSoundtrack.togglePlay();
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 select-none pointer-events-auto">
      <motion.button
        type="button"
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        aria-label={isPlaying ? 'Stop Sillow Mill - Bingäa soundtrack' : 'Play Sillow Mill - Bingäa soundtrack'}
        title={isPlaying ? 'Pause/Stop: Sillow Mill - Bingäa' : 'Play Soundtrack: Sillow Mill - Bingäa'}
        className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-full border transition-all duration-300 cursor-pointer backdrop-blur-xl ${
          isPlaying
            ? 'bg-[#050505]/90 border-cyan-400/50 text-cyan-200 shadow-[0_0_25px_rgba(56,189,248,0.35)]'
            : 'bg-[#050505]/80 hover:bg-[#050505] border-white/20 hover:border-cyan-400/50 text-white/80 hover:text-cyan-200 shadow-[0_4px_20px_rgba(0,0,0,0.6)]'
        }`}
      >
        {/* Dynamic Equalizer or Play/Stop Icon */}
        <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
          {isPlaying ? (
            <div className="flex items-end justify-center gap-[2px] w-4 h-3.5">
              <span className="w-0.5 bg-cyan-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-full" />
              <span className="w-0.5 bg-cyan-300 rounded-full animate-[bounce_0.8s_infinite_300ms] h-2/3" />
              <span className="w-0.5 bg-cyan-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-5/6" />
            </div>
          ) : (
            <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400 ml-0.5" />
          )}
        </div>

        {/* Track info & Status */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="font-semibold tracking-wide text-white hidden xs:inline max-w-[130px] sm:max-w-[160px] truncate">
            Bingäa
          </span>

          <span
            className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full transition-colors ${
              isPlaying
                ? 'bg-cyan-950 border border-cyan-400/40 text-cyan-300 flex items-center gap-1'
                : 'bg-white/10 text-white/60'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-2.5 h-2.5 fill-cyan-300" />
                <span>PAUSE</span>
              </>
            ) : (
              'PLAY'
            )}
          </span>
        </div>
      </motion.button>
    </div>
  );
};
