import React, { useState, useEffect } from 'react';
import { Music, Volume2, VolumeX, Disc3 } from 'lucide-react';
import { planetSoundtrack } from '../utils/soundtrack';

export const SoundtrackButton: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = planetSoundtrack.subscribe((playing) => {
      setIsPlaying(playing);
    });
    return unsubscribe;
  }, []);

  const handleToggle = async () => {
    await planetSoundtrack.togglePlay();
  };

  return (
    <button
      onClick={handleToggle}
      type="button"
      aria-label={isPlaying ? 'Pause Sillow Mill - Bingäa' : 'Play Sillow Mill - Bingäa'}
      title={isPlaying ? 'Pause Soundtrack: Sillow Mill - Bingäa' : 'Play Soundtrack: Sillow Mill - Bingäa'}
      className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all duration-300 cursor-pointer select-none ${
        isPlaying
          ? 'bg-cyan-950/80 border-cyan-400/60 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.35)]'
          : 'bg-black/50 hover:bg-black/80 border-white/20 hover:border-cyan-400/50 text-white/80 hover:text-cyan-200 shadow-md hover:shadow-[0_0_12px_rgba(103,232,249,0.2)]'
      }`}
    >
      {/* Dynamic Soundwave / Equalizer or Spinning Disc icon */}
      <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
        {isPlaying ? (
          <div className="flex items-end justify-center gap-[2px] w-4 h-3.5">
            <span className="w-0.5 bg-cyan-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-full" />
            <span className="w-0.5 bg-cyan-300 rounded-full animate-[bounce_0.8s_infinite_300ms] h-2/3" />
            <span className="w-0.5 bg-cyan-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-5/6" />
          </div>
        ) : (
          <Music className="w-3.5 h-3.5 text-cyan-400/80 group-hover:scale-110 transition-transform" />
        )}
      </div>

      {/* Track Label */}
      <div className="flex items-center gap-1.5 overflow-hidden">
        <span className="font-medium tracking-wide truncate max-w-[110px] sm:max-w-[160px]">
          Sillow Mill - Bingäa
        </span>
        <span
          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
            isPlaying
              ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40'
              : 'bg-white/10 text-white/50 group-hover:bg-cyan-950 group-hover:text-cyan-300'
          }`}
        >
          {isPlaying ? 'PLAYING' : 'AUDIO'}
        </span>
      </div>
    </button>
  );
};
