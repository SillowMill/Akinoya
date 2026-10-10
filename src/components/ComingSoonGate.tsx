import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';
import { planetSoundtrack } from '../utils/soundtrack';
import { KeyRound, Sparkles, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface ComingSoonGateProps {
  onUnlockSuccess: () => void;
  onToggleBackdropMode?: () => void;
  backdropOnly?: boolean;
}

// Release Target: January 9, 2027 (00:00:00 CET)
const TARGET_RELEASE_DATE = new Date('2027-01-09T00:00:00+01:00').getTime();

interface CountdownTime {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  isComplete: boolean;
}

const calculateTimeRemaining = (): CountdownTime => {
  const diff = TARGET_RELEASE_DATE - Date.now();

  if (diff <= 0) {
    return {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
      isComplete: true,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    isComplete: false,
  };
};

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
  const [countdown, setCountdown] = useState<CountdownTime>(calculateTimeRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateTimeRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying || isSuccess) return;

    const trimmed = accessCode.trim();

    if (!trimmed) {
      setHasError(true);
      setErrorMessage('Please enter an access code.');
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
        // Audio does NOT auto-play — user must press Play manually in the header widget.

        try {
          sessionStorage.setItem('akinoya_public_unlocked', 'true');
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
        <span>Show Interface</span>
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
        className="relative bg-black/60 sm:bg-black/45 backdrop-blur-xl border border-white/15 rounded-2xl p-5 sm:p-7 md:p-8 lg:p-9 max-w-md sm:max-w-xl md:max-w-2xl w-full mx-auto shadow-[0_8px_32px_0_rgba(0,0,0,0.7)] glow-cyan-sm overflow-hidden"
      >
        {/* Subtle decorative celestial grid shimmer inside card */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Header & Minimalist Controls */}
          <div className="flex items-center justify-end sm:justify-between w-full mb-4 sm:mb-5 gap-3">
            {/* Desktop Release Date Badge (Hidden on mobile) */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_14px_rgba(103,232,249,0.2)] text-[10.5px] md:text-xs font-mono text-cyan-300">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.9)] shrink-0" />
                <span className="font-semibold text-cyan-200 tracking-wider whitespace-nowrap">
                  RELEASE DATE: 09.01.2027
                </span>
              </div>
              <span className="text-cyan-500/40 select-none">|</span>
              <span className="text-[10px] md:text-[11px] font-mono tracking-wider text-cyan-300/90 tabular-nums whitespace-nowrap font-medium">
                [ T- {countdown.days}D : {countdown.hours}H : {countdown.minutes}M : {countdown.seconds}S ]
              </span>
            </div>

            {/* Quick toggle to see full background artwork without UI */}
            {onToggleBackdropMode && (
              <button
                type="button"
                onClick={onToggleBackdropMode}
                className="flex items-center gap-1.5 text-[11px] font-mono text-white/50 hover:text-cyan-300 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 shrink-0"
                title="View the Äkinoya artwork in full screen"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Background</span>
              </button>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-[0.16em] text-white/95 uppercase mb-2">
            SILLOW MILL
          </h1>

          {/* Sold Out Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 backdrop-blur-md border border-amber-500/40 shadow-[0_0_14px_rgba(245,158,11,0.2)] text-[10.5px] sm:text-xs font-mono text-amber-300 font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.9)] shrink-0" />
            <span>• 100/100 FOUNDING EDITIONS CLAIMED (SOLD OUT)</span>
          </div>

          {/* Mobile Release Date Badge (Centered underneath title) */}
          <div className="sm:hidden flex justify-center w-full my-3">
            <div className="inline-flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-950/60 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_14px_rgba(103,232,249,0.2)] text-[10.5px] font-mono text-cyan-300 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.9)] shrink-0" />
                <span className="font-semibold text-cyan-200 tracking-wider">
                  RELEASE DATE: 09.01.2027
                </span>
              </div>
              <span className="text-[10px] font-mono tracking-wider text-cyan-300/90 tabular-nums font-medium">
                [ T- {countdown.days}D : {countdown.hours}H : {countdown.minutes}M : {countdown.seconds}S ]
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-white/70 font-sans max-w-xs md:max-w-sm leading-relaxed mb-6">
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
                  Use 'SillowMill2027'
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
                  <span>Access granted! Opening portal...</span>
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
                    VERIFYING...
                  </span>
                ) : isSuccess ? (
                  <span className="flex items-center gap-2 text-emerald-300">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    ÄKINOYA UNLOCKED...
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
            <span>BOOK CODE: Back cover</span>
            <span className="text-cyan-400/80">SillowMill2027</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
