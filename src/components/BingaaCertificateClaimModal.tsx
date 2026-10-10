import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { X, KeyRound, Mail, ShieldCheck, AlertCircle, Loader2, ArrowLeft, RefreshCw, User, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveHolderName, sanitizeHolderName, HOLDER_NAME_MAX_LENGTH } from '../utils/holder';
import {
  BingaaCertificate,
  saveCertificate,
  requestCardPin,
  verifyAndCertify,
} from '../utils/certificate';

interface BingaaCertificateClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  passId: string;
  defaultName?: string;
  onCertified?: (cert: BingaaCertificate) => void;
}

export const BingaaCertificateClaimModal: React.FC<BingaaCertificateClaimModalProps> = ({
  isOpen,
  onClose,
  passId,
  defaultName = '',
  onCertified,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [isSendingPin, setIsSendingPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devPin, setDevPin] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName((prev) => prev || defaultName);
      setStep(1);
      setPin('');
      setError(null);
      setInfo(null);
      setDevPin(null);
    }
  }, [isOpen, defaultName]);

  const cleanName = sanitizeHolderName(name);
  const cleanEmail = email.trim();
  const cleanPin = pin.replace(/\D/g, '').slice(0, 6);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail);
  const isPinValid = cleanPin.length === 6;

  // Step 1: Request 6-digit PIN via Resend email delivery
  const handleSendPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cleanName) {
      setError('Please enter your full holder name.');
      return;
    }
    if (!isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSendingPin(true);
    setError(null);
    setInfo(null);

    try {
      const result = await requestCardPin(passId, cleanEmail, cleanName);
      if (result.success) {
        setStep(2);
        setInfo(result.message || `Card Security PIN dispatched to ${cleanEmail}. Check your inbox.`);
        if (result.devMode && result.pin) {
          setDevPin(result.pin);
        }
        soundManager.playTone(880, 0.08);
      } else {
        setError(result.message || result.error || 'Failed to dispatch Card PIN. Please try again.');
        soundManager.playError();
      }
    } catch {
      setError('Network connection error. Please try again.');
      soundManager.playError();
    } finally {
      setIsSendingPin(false);
    }
  };

  // Step 2: Authenticate with the 6-digit Card PIN received in email
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPinValid) {
      setError('Enter the complete 6-digit Card Security PIN.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await verifyAndCertify(passId, cleanPin, cleanName, cleanEmail);
      if (result.success && result.certificate) {
        saveCertificate(result.certificate);
        saveHolderName(result.certificate.holderName);
        soundManager.playUnlockChime();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.55 },
          colors: ['#22d3ee', '#34d399', '#ffffff'],
        });
        onCertified?.(result.certificate);
        onClose();
      } else {
        setError(result.message || result.error || 'Invalid Card Security PIN. Check your email and try again.');
        soundManager.playError();
      }
    } catch {
      setError('Network connection error. Please try again.');
      soundManager.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors font-mono';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className="relative w-full max-w-md my-auto rounded-2xl bg-[#0a0d14] border border-cyan-500/30 p-5 sm:p-6 shadow-2xl overflow-hidden"
          >
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            <button
              type="button"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
                ÄKINOYA VIP PROTOCOL
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-white/10 text-white/60">
                Step {step} of 2
              </span>
            </div>

            <h3 className="mt-1 text-lg sm:text-xl font-display font-bold text-white pr-6 leading-snug">
              {step === 1 ? 'Claim Official Certificate & Unlock Downloads' : 'Enter Card Security PIN'}
            </h3>

            <p className="mt-1.5 text-xs text-white/60 leading-relaxed">
              {step === 1
                ? 'Enter your name and email address to receive your 6-digit Card PIN. Verifying will issue your signed Certificate of Authenticity (#1 of 100) and unlock PDF downloads.'
                : `A 6-digit Card Security PIN was dispatched to ${cleanEmail}. Enter it below to authenticate pass #${passId}.`}
            </p>

            {/* STEP 1: Enter Name + Email -> Send PIN */}
            {step === 1 && (
              <form onSubmit={handleSendPin} noValidate className="mt-5 space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="coa-name" className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-white/60 uppercase">
                    <User className="w-3 h-3 text-cyan-400" />
                    <span>Holder Name</span>
                  </label>
                  <input
                    id="coa-name"
                    type="text"
                    autoComplete="name"
                    maxLength={HOLDER_NAME_MAX_LENGTH}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Name as it should appear on certificate"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="coa-email" className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-white/60 uppercase">
                    <Mail className="w-3 h-3 text-cyan-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    id="coa-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-[11px] font-mono text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSendingPin || !cleanName || !isEmailValid}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isSendingPin ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>DISPATCHING PIN…</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Send Card PIN to Email</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: Enter 6-digit Card PIN received in email */}
            {step === 2 && (
              <form onSubmit={handleVerifyPin} noValidate className="mt-5 space-y-3.5">
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between text-white/60">
                    <span>HOLDER</span>
                    <span className="text-white font-medium truncate max-w-[200px]">{cleanName}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/60">
                    <span>RECIPIENT</span>
                    <span className="text-cyan-300 font-medium truncate max-w-[200px]">{cleanEmail}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="coa-pin" className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-white/60 uppercase">
                    <KeyRound className="w-3 h-3 text-cyan-400" />
                    <span>6-Digit Card Security PIN</span>
                  </label>
                  <div className="relative">
                    <input
                      id="coa-pin"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      autoFocus
                      maxLength={6}
                      value={cleanPin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="••••••"
                      className={`${inputClass} text-center tracking-[0.5em] text-lg font-bold text-cyan-300`}
                    />
                  </div>
                </div>

                {devPin && (
                  <div className="text-[11px] font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span>Development PIN: <strong>{devPin}</strong></span>
                    <button
                      type="button"
                      onClick={() => setPin(devPin)}
                      className="text-[10px] underline hover:text-white cursor-pointer ml-2"
                    >
                      Fill
                    </button>
                  </div>
                )}

                {info && !error && (
                  <div className="flex items-start gap-2 text-[11px] font-mono text-cyan-200/90 bg-cyan-950/30 border border-cyan-500/20 rounded-xl px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400" />
                    <span>{info}</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 text-[11px] font-mono text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-white/50">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError(null);
                    }}
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Edit email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendPin()}
                    disabled={isSendingPin}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSendingPin ? 'animate-spin' : ''}`} />
                    <span>Resend PIN</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !isPinValid}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AUTHENTICATING…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>AUTHENTICATE &amp; VERIFY PASS</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
