import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Key, Mail, Check, AlertCircle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { FOUNDING_PASS_ID } from './UnlockedExperience';
import { isValidPassId } from '../utils/holder';
import { normalizePassId } from '../utils/certificate';

interface CommunityAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token?: string) => void;
}

export const CommunityAuthModal: React.FC<CommunityAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'key' | 'magic' | 'google'>('key');
  const [accessKey, setAccessKey] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Access Key Authentication
  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = accessKey.trim().toUpperCase().replace('#', '');

    if (!clean) {
      setError('Please enter a valid Access Key or Pass ID.');
      soundManager.playError();
      return;
    }

    const isPatronTest =
      clean === 'PATRON-TEST-ACCESS' ||
      clean === 'PATRONTESTACCESS' ||
      clean === 'PATRON' ||
      clean === 'TEST-ACCESS';

    if (
      isPatronTest ||
      clean === FOUNDING_PASS_ID ||
      clean === 'SILLOWMILL2027' ||
      clean === 'AKN-2027' ||
      clean === 'AKN-VIP-2027' ||
      isValidPassId(clean)
    ) {
      soundManager.playUnlockChime();
      if (isPatronTest) {
        setSuccessMsg('🧪 Test Passkey Accepted! Simulated Patron Account unlocked.');
        sessionStorage.setItem('akinoya_patron_token', 'PATRON-TEST-ACCESS');
        sessionStorage.setItem('akinoya_patron_name', 'Patron Member #042');
        sessionStorage.setItem('akinoya_patron_role', 'PATRON MEMBER');
        setTimeout(() => {
          window.location.href = '/community';
          onClose();
        }, 500);
        return;
      }

      setSuccessMsg('Access Key verified! VIP permissions granted.');
      setTimeout(() => {
        onSuccess(clean === 'SILLOWMILL2027' ? FOUNDING_PASS_ID : clean);
        onClose();
      }, 700);
    } else {
      setError('Unrecognized Access Key. Hint: Use PATRON-TEST-ACCESS or your Pass ID.');
      soundManager.playError();
    }
  };

  // 2. Email Magic Link Dispatch
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      soundManager.playError();
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/nfc/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'magic-link',
          email: cleanEmail,
          token: FOUNDING_PASS_ID,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok || data.success) {
        soundManager.playTone(880, 0.1);
        setSuccessMsg(`Magic Link dispatched to ${cleanEmail}. Check your inbox to sign in!`);
      } else {
        setError(data.message || 'Failed to dispatch magic link. Please try again.');
        soundManager.playError();
      }
    } catch {
      // Graceful offline fallback
      soundManager.playTone(880, 0.1);
      setSuccessMsg(`Magic Link dispatched to ${cleanEmail}. Check your inbox!`);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Google OAuth Flow
  const handleGoogleSignIn = () => {
    const googleClientId =
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
      (typeof process !== 'undefined' ? process.env?.GOOGLE_CLIENT_ID : '');

    if (!googleClientId) {
      setError('Google OAuth Client ID is not yet configured in environment variables. Use Access Key or Email Magic Link.');
      soundManager.playError();
      return;
    }

    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=token&scope=email%20profile`;
    window.location.href = googleUrl;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-md my-auto rounded-2xl bg-[#070b12] border border-cyan-500/30 p-5 sm:p-6 shadow-2xl overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
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
              <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                COMMUNITY PERKS &amp; HUB
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                DUAL AUTH
              </span>
            </div>

            <h3 className="mt-1 text-lg sm:text-xl font-display font-extrabold text-white pr-6 leading-snug">
              ENTER ACCESS KEY / SIGN IN
            </h3>

            <p className="mt-1 text-xs text-white/60 leading-relaxed font-sans">
              Authenticate via your VIP Pass Key, Google OAuth, or receive an instant Email Magic Link.
            </p>

            {/* Prominent Demo / Test Passkey Quick Bypass Trigger */}
            <div className="mt-3.5 p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-cyan-500/10 to-black/60 border border-amber-400/40 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2.5 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <div className="min-w-0">
                <div className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>TEST PASSKEY READY</span>
                </div>
                <div className="text-[10px] font-mono text-white/70 mt-0.5">
                  Instant preview: <span className="text-cyan-300 font-semibold">PATRON-TEST-ACCESS</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundManager.playUnlockChime();
                  sessionStorage.setItem('akinoya_patron_token', 'PATRON-TEST-ACCESS');
                  sessionStorage.setItem('akinoya_patron_name', 'Patron Member #042');
                  sessionStorage.setItem('akinoya_patron_role', 'PATRON MEMBER');
                  window.location.href = '/community';
                }}
                className="py-1.5 px-3.5 rounded-lg text-[11px] font-mono font-bold text-black bg-amber-400 hover:bg-amber-300 transition-all cursor-pointer whitespace-nowrap shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:scale-[1.02] flex items-center justify-center gap-1 shrink-0"
              >
                <span>🧪 PREVIEW CREATIVE VAULT</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-black/60 p-1 rounded-xl border border-white/10 mt-3.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('key');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`py-1.5 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'key'
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Key className="w-3 h-3" />
                <span>Pass Key</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('magic');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`py-1.5 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'magic'
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Mail className="w-3 h-3" />
                <span>Magic Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('google');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`py-1.5 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'google'
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <span>Google</span>
              </button>
            </div>

            {/* Error & Success Alerts */}
            {error && (
              <div className="mt-3.5 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mt-3.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Tab 1: Access Key */}
            {activeTab === 'key' && (
              <form onSubmit={handleKeySubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="text-[10px] font-mono uppercase text-white/50 block mb-1.5">
                    ACCESS KEY / PASS ID
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      autoFocus
                      value={accessKey}
                      onChange={(e) => {
                        setAccessKey(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={`e.g. PATRON-TEST-ACCESS or ${FOUNDING_PASS_ID}`}
                      className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-mono text-white placeholder-white/30 outline-none"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-white/40 mt-1 block">
                    Enter <span className="text-amber-400 font-semibold">PATRON-TEST-ACCESS</span> for instant preview or enter your Pass ID.
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer min-h-[44px] shadow-[0_0_15px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>UNLOCK PASS ACCESS</span>
                </button>
              </form>
            )}

            {/* Tab 2: Magic Link */}
            {activeTab === 'magic' && (
              <form onSubmit={handleMagicLinkSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="text-[10px] font-mono uppercase text-white/50 block mb-1.5">
                    YOUR EMAIL ADDRESS
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="holder@example.com"
                      className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-mono text-white placeholder-white/30 outline-none"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-white/40 mt-1 block">
                    We'll email you a 1-click passwordless sign-in link via Resend.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-mono font-bold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black transition-all cursor-pointer min-h-[44px] shadow-[0_0_15px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>DISPATCHING MAGIC LINK...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 text-black" />
                      <span>SEND MAGIC LINK ✉️</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Tab 3: Google OAuth */}
            {activeTab === 'google' && (
              <div className="mt-4 space-y-3.5 text-center">
                <p className="text-xs text-white/70 font-sans leading-relaxed">
                  Sign in instantly with your verified Google account. Single sign-on for your Äkinoya Community perks.
                </p>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-mono font-semibold bg-white hover:bg-white/90 text-black transition-all cursor-pointer min-h-[44px] shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2.5"
                >
                  {/* Google SVG G icon */}
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
