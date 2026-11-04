import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { soundManager } from '../utils/audio';

export const LaunchNoticeHudToast: React.FC = () => {
  const [notice, setNotice] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleLaunchNotice = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      const msg =
        customEvent.detail?.message ||
        'Hé, het wordt pas gelanceerd op 9 januari 2027 · De volledige Member Pass, downloads en master visualizer packs ontgrendelen op de officiële launch.';

      soundManager.playTone(660, 0.05);
      setNotice(msg);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setNotice(null);
      }, 6500);
    };

    window.addEventListener('akinoya-launch-notice', handleLaunchNotice);
    return () => {
      window.removeEventListener('akinoya-launch-notice', handleLaunchNotice);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[200] max-w-xl w-[92vw] sm:w-auto pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-2xl px-4 sm:px-5 py-3.5 backdrop-blur-2xl bg-[#080d1a]/95 border-2 border-amber-400/70 shadow-[0_12px_45px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.4)] flex items-center justify-between gap-3 sm:gap-4 text-white">
            {/* Gold & Cyan Dual Glow */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-cyan-500/20" />
            <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-300 to-transparent pointer-events-none" />

            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-950/90 border border-amber-400/60 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.4)] text-amber-300">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="space-y-0.5 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-amber-300">
                    Release Protocol · 9 Januari 2027
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-sans text-white/95 font-medium leading-snug">
                  {notice}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNotice(null)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              aria-label="Sluit melding"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LaunchNoticeHudToast;
