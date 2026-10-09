import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck, AlertCircle, X, Sparkles, Radio } from 'lucide-react';
import { useVipAccess } from '../context/VipAccessContext';

export const NfcHudToast: React.FC = () => {
  const { toast, dismissToast } = useVipAccess();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        dismissToast();
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [toast, dismissToast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-[94vw] sm:w-auto pointer-events-auto"
        >
          <div
            className={`relative overflow-hidden rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 backdrop-blur-2xl border flex items-center gap-3 sm:gap-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] ${
              toast.type === 'error'
                ? 'bg-[#18080a]/95 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.3)] text-rose-200'
                : 'bg-[#040810]/95 border-cyan-400/50 shadow-[0_0_35px_rgba(34,211,238,0.35)] text-cyan-200'
            }`}
          >
            {/* Ambient cyber gradient glow */}
            <div
              className={`absolute inset-0 pointer-events-none opacity-25 bg-gradient-to-r ${
                toast.type === 'error'
                  ? 'from-rose-500/20 via-transparent to-red-500/20'
                  : 'from-cyan-500/20 via-emerald-500/20 to-blue-500/20'
              }`}
            />

            {/* Glowing icon beacon */}
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                toast.type === 'error'
                  ? 'bg-rose-950/80 border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'bg-cyan-950/80 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
              }`}
            >
              {toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-cyan-300 animate-pulse" />
              )}
            </div>

            {/* Toast content */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`text-[9.5px] sm:text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full font-bold border ${
                    toast.type === 'error'
                      ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                      : 'bg-cyan-950 text-cyan-300 border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                  }`}
                >
                  {toast.type === 'error' ? 'AUTHENTICATION REJECTED' : 'NFC PROTOCOL ACTIVE'}
                </span>
                {toast.type !== 'error' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                )}
              </div>
              <div className="text-xs sm:text-sm font-display font-bold tracking-wide text-white truncate">
                {toast.message}
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono text-white/50 truncate">
                {toast.type === 'error'
                  ? 'LINK FORWARDING RESTRICTED · ACCESS DENIED'
                  : 'SINGLE-DEVICE SESSION SECURED · ALL GATES UNLOCKED'}
              </div>
            </div>

            {/* Dismiss button */}
            <button
              onClick={dismissToast}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
