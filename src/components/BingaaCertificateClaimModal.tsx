import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { X, KeyRound, Mail, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { saveHolderName, sanitizeHolderName, HOLDER_NAME_MAX_LENGTH } from '../utils/holder';
import { BingaaCertificate, saveCertificate } from '../utils/certificate';

interface BingaaCertificateClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  passId: string;
  defaultName?: string;
  onCertified?: (cert: BingaaCertificate) => void;
}

const postCertificateAction = async (payload: Record<string, unknown>) => {
  const res = await fetch('/api/nfc/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data?.success, data };
};

/**
 * Verification flow for the Bingäa Issue #1 Collector's Edition:
 * Holder Name + Physical Card Security PIN, with optional Email 2FA (one-time code).
 */
export const BingaaCertificateClaimModal: React.FC<BingaaCertificateClaimModalProps> = ({
  isOpen,
  onClose,
  passId,
  defaultName = '',
  onCertified,
}) => {
  const [name, setName] = useState(defaultName);
  const [pin, setPin] = useState('');
  const [useEmail, setUseEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName((prev) => prev || defaultName);
      setError(null);
      setInfo(null);
    }
  }, [isOpen, defaultName]);

  const cleanName = sanitizeHolderName(name);
  const cleanPin = pin.replace(/\D/g, '').slice(0, 6);
  const pinValid = cleanPin.length === 6;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const otpValid = otp.replace(/\D/g, '').length === 6;
  const canSubmit =
    Boolean(cleanName) && pinValid && (!useEmail || (otpSent && otpValid)) && !isSubmitting;

  const handleSendOtp = async () => {
    if (!pinValid) return setError('Enter the 6-digit Card Security PIN first.');
    if (!emailValid) return setError('Please enter a valid email address.');
    setIsSendingOtp(true);
    setError(null);
    setInfo(null);
    try {
      const { ok, data } = await postCertificateAction({
        action: 'send-otp',
        token: passId,
        pin: cleanPin,
        email: email.trim(),
      });
      if (ok) {
        setOtpSent(true);
        setInfo(data.message || 'Verification code sent. Check your inbox.');
        soundManager.playTone(880, 0.08);
      } else if (data?.error === 'EMAIL_OTP_UNAVAILABLE') {
        setUseEmail(false);
        setOtpSent(false);
        setInfo(data.message);
      } else {
        setError(data?.message || 'Could not send the verification code.');
        soundManager.playError();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { ok, data } = await postCertificateAction({
        action: 'certify',
        token: passId,
        ownerName: cleanName,
        pin: cleanPin,
        ...(useEmail ? { email: email.trim(), otp: otp.replace(/\D/g, '') } : {}),
      });
      if (!ok || !data?.certificate) {
        setError(data?.message || 'Verification failed. Please check your details.');
        soundManager.playError();
        return;
      }
      const cert = data.certificate as BingaaCertificate;
      saveCertificate(cert);
      saveHolderName(cert.holderName);
      soundManager.playUnlockChime();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.55 }, colors: ['#22d3ee', '#34d399', '#ffffff'] });
      onCertified?.(cert);
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-black border border-white/20 focus:border-cyan-400 rounded-lg px-3 py-2.5 text-base sm:text-sm text-white placeholder:text-white/30 outline-none transition-colors font-mono';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className="relative w-full max-w-md my-6 rounded-2xl bg-[#0a0d14] border border-white/10 p-5 sm:p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-[10px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
              Collector's Edition Verification
            </div>
            <h3 className="mt-1 text-lg sm:text-xl font-display font-bold text-white pr-8">
              Claim Your Certificate of Authenticity
            </h3>
            <p className="mt-1.5 text-xs text-white/55 leading-relaxed">
              Enter your name and the 6-digit Security PIN printed on your physical Äkinoya Founding Pass to
              authenticate Bingäa Issue #1 for pass <span className="text-white/80 font-mono">#{passId}</span>.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-3.5">
              <div className="space-y-1.5">
                <label htmlFor="coa-name" className="block text-[10px] font-mono tracking-wider text-white/50">
                  HOLDER NAME
                </label>
                <input
                  id="coa-name"
                  type="text"
                  autoComplete="name"
                  maxLength={HOLDER_NAME_MAX_LENGTH}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name as it should appear on the certificate"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="coa-pin" className="block text-[10px] font-mono tracking-wider text-white/50">
                  CARD SECURITY PIN
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="coa-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={cleanPin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="••••••"
                    className={`${inputClass} pl-9 tracking-[0.4em]`}
                  />
                </div>
              </div>

              {/* Optional Email 2FA */}
              <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2.5">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="flex items-center gap-2 text-xs text-white/80">
                    <Mail className="w-3.5 h-3.5 text-cyan-300" />
                    Add Email 2FA <span className="text-white/40">(optional)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={useEmail}
                    onChange={(e) => {
                      setUseEmail(e.target.checked);
                      setOtpSent(false);
                      setOtp('');
                      setInfo(null);
                    }}
                    className="w-4 h-4 accent-cyan-400 cursor-pointer"
                  />
                </label>

                {useEmail && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setOtpSent(false);
                        }}
                        placeholder="you@example.com"
                        className={`${inputClass} min-w-0`}
                      />
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || !emailValid || !pinValid}
                        className="shrink-0 px-3 rounded-lg text-[11px] font-mono font-semibold text-cyan-300 border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-950/70 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSendingOtp ? 'Sending…' : otpSent ? 'Resend' : 'Send code'}
                      </button>
                    </div>
                    {otpSent && (
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit email code"
                        className={`${inputClass} tracking-[0.3em]`}
                      />
                    )}
                  </div>
                )}
              </div>

              {info && <div className="text-[11px] font-mono text-cyan-200/90">{info}</div>}
              {error && (
                <div className="flex items-start gap-2 text-[11px] font-mono text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-3 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-2 transition-all cursor-pointer disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{isSubmitting ? 'AUTHENTICATING…' : 'AUTHENTICATE & CLAIM'}</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
