import React, { useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';
import { KeyRound, Sparkles, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface ComingSoonGateProps {
  onUnlockSuccess: () => void;
  onToggleBackdropMode?: () => void;
  backdropOnly?: boolean;
}

export const ComingSoonGate: React.FC<ComingSoonGateProps> = ({
  onUnlockSuccess,
  onToggleBackdropMode,
  backdropOnly = false,
}) => {
  const [accessCode, setAccessCode] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying || isSuccess) return;

    const trimmed = accessCode.trim();

    if (!trimmed) {
      setHasError(true);
      setErrorMessage('Vul een toegangscode in.');
      soundManager.playDenyTone();
      return;
    }

    setIsVerifying(true);
    setHasError(false);
    setErrorMessage('');

    // Verification check
    setTimeout(() => {
      if (trimmed === 'SillowMill2027') {
        setIsSuccess(true);
        setIsVerifying(false);
        soundManager.playUnlockChime();

        try {
          sessionStorage.setItem('akinoya_vip_unlocked', 'true');
        } catch {
          // fallback
        }

        // Fire celebratory celestial particles
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#67e8f9', '#38bdf8', '#3b82f6', '#c084fc', '#ffffff'],
          disableForReducedMotion: true,
        });

        // Trigger unlock transition
        setTimeout(() => {
          onUnlockSuccess();
        }, 850);
      } else {
        setIsVerifying(false);
        setHasError(true);
        setErrorMessage('Access Denied. Check the back of your book.');
        soundManager.playDenyTone();
      }
    }, 450);
  };

  const handleQuickFill = () => {
    setAccessCode('SillowMill2027');
    setHasError(false);
    setErrorMessage('');
  };

  if (backdropOnly) {
    return (
      <button
        onClick={onToggleBackdropMode}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2.5 bg-black/80 backdrop-blur-md border border-cyan-400/40 text-cyan-200 text-xs font-mono rounded-full shadow-lg hover:bg-black transition-all cursor-pointer"
      >
        <EyeOff className="w-4 h-4" />
        <span>Toon Interface</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.96 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex items-center justify-center px-4 z-10"
    >
      <motion.div
        animate={
          hasError
            ? {
                x: [-10, 10, -6, 6, -3, 3, 0],
                transition: { duration: 0.4 },
              }
            : {}
        }
        className="relative bg-black/60 sm:bg-black/45 backdrop-blur-xl border border-white/15 rounded-2xl p-5 sm:p-8 max-w-md w-full mx-auto shadow-[0_8px_32px_0_rgba(0,0,0,0.7)] glow-cyan-sm overflow-hidden"
      >
        {/* Subtle decorative celestial grid shimmer inside card */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Header & Minimalist Badge */}
          <div className="flex items-center justify-between w-full mb-3">
            <span className="text-[10px] sm:text-xs font-mono tracking-[0.2em] uppercase text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full bg-cyan-950/60 shadow-[0_0_12px_rgba(103,232,249,0.25)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              COMING SOON
            </span>

            {/* Quick toggle to see full background artwork without UI */}
            {onToggleBackdropMode && (
              <button
                type="button"
                onClick={onToggleBackdropMode}
                className="flex items-center gap-1 text-[11px] font-mono text-white/50 hover:text-cyan-300 transition-colors cursor-pointer py-1 px-2 rounded hover:bg-white/5"
                title="Bekijk de Äkinoya afbeelding op volledig scherm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Achtergrond</span>
              </button>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-[0.16em] text-white/95 uppercase mb-1.5">
            SILLOW MILL
          </h1>

          <p className="text-xs sm:text-sm text-white/70 font-sans max-w-xs leading-relaxed mb-6">
            Enter your Äkinoya access code to unlock the portal.
          </p>

          {/* Code Gate Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative text-left">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="accessCodeInput"
                  className="text-[11px] sm:text-xs font-mono text-white/60 tracking-wider uppercase"
                >
                  Access Key
                </label>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-[11px] font-mono text-cyan-300 hover:text-cyan-200 underline underline-offset-2 cursor-pointer"
                >
                  Vul 'SillowMill2027' in
                </button>
              </div>

              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-white/40 pointer-events-none">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                </div>

                <input
                  id="accessCodeInput"
                  type="text"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    if (hasError) setHasError(false);
                  }}
                  disabled={isVerifying || isSuccess}
                  placeholder="Enter code (e.g. SillowMill2027)"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  inputMode="text"
                  className={`w-full bg-black/70 border ${
                    hasError
                      ? 'border-red-500 focus:border-red-400 focus:ring-red-500/20'
                      : isSuccess
                      ? 'border-emerald-500 focus:border-emerald-400'
                      : 'border-white/20 focus:border-cyan-400 focus:ring-cyan-400/25'
                  } rounded-xl py-3 pl-10 pr-24 text-base sm:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-all font-mono tracking-wide`}
                />

                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="absolute right-2 px-2.5 py-1.5 text-[11px] font-mono font-medium text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/50 rounded-lg transition-colors cursor-pointer"
                >
                  Code
                </button>
              </div>

              {/* Error or Success message */}
              {hasError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex items-center gap-1.5 text-xs text-rose-400 font-sans"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-sans"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Toegang verleend! Opening portal...</span>
                </motion.div>
              )}
            </div>

            {/* Enter Button */}
            <button
              type="submit"
              disabled={isVerifying || isSuccess}
              className="w-full relative group overflow-hidden rounded-xl p-[1px] font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-60 cursor-pointer min-h-[46px]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 group-hover:opacity-100 opacity-80 blur-[1px] transition-opacity" />

              <div className="relative h-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#091522] to-[#040810] hover:from-[#0c1e33] hover:to-[#07111c] text-cyan-200 font-display font-semibold tracking-wider text-xs sm:text-sm py-3 px-6 rounded-xl transition-all border border-cyan-400/30 group-hover:border-cyan-300/60 group-hover:text-white shadow-[0_0_20px_rgba(56,189,248,0.25)]">
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    VERIFIËREN...
                  </span>
                ) : isSuccess ? (
                  <span className="flex items-center gap-2 text-emerald-300">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    ÄKINOYA GEOPEND...
                  </span>
                ) : (
                  <>
                    <span>ENTER ÄKINOYA</span>
                    <ArrowRight className="w-4 h-4 text-cyan-300 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Book Reference */}
          <div className="mt-5 pt-4 border-t border-white/10 w-full flex items-center justify-between text-[11px] text-white/50 font-mono">
            <span>BOEK CODE: Achterkant</span>
            <span className="text-cyan-400/80">SillowMill2027</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
