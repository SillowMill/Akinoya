import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../utils/audio';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    hasPendingVipInvitation,
    vipLinkError,
    closeAuthModal,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    resetPasswordForEmail,
    updatePassword,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'update_password'>(
    (authModalMode as any) || 'signin'
  );
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time password validation criteria
  const hasMinLength = password.length >= 8;
  const hasSpecialChar =
    /[!@#$%^&*()_+\-=[\]{}|;:,.<>?~`'"/\\]/.test(password) || /[^A-Za-z0-9\s]/.test(password);
  const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);

  // Sync mode with context
  React.useEffect(() => {
    if (authModalMode) {
      setMode(authModalMode as any);
      setError(null);
      setSuccess(null);
      setConfirmPassword('');
      setShowConfirmPassword(false);
    }
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleGoogleAuth = async () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const res = await signInWithGoogle();
      if (res?.error) {
        setError(res.error.message || 'Google authentication failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Google authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'signup' || mode === 'update_password') {
      if (!hasMinLength) {
        setError('Password must contain at least 8 characters.');
        soundManager.playError();
        return;
      }
      if (!hasSpecialChar) {
        setError('Password must contain at least 1 special character (e.g. !@#$%^&*).');
        soundManager.playError();
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please ensure both passwords match exactly.');
        soundManager.playError();
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        const res = await signUpWithEmail(email, password, firstName, lastName);
        if (!res.success) {
          setError(res.error || 'Registration failed.');
          soundManager.playError();
        } else {
          setSuccess('Account created successfully! Welcome to Sillow Mill.');
          if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new CustomEvent('akinoya-navigate-home'));
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
          closeAuthModal();
        }
      } else if (mode === 'reset') {
        const res = await resetPasswordForEmail(email);
        if (!res.success) {
          setError(res.error || 'Password reset request failed.');
          soundManager.playError();
        } else {
          soundManager.playUnlockChime();
          setSuccess('Password reset link sent! Check your inbox to recover your account.');
        }
      } else if (mode === 'update_password') {
        const res = await updatePassword(password);
        if (!res.success) {
          setError(res.error || 'Password update failed.');
          soundManager.playError();
        } else {
          soundManager.playUnlockChime();
          setSuccess('Password updated successfully! Redirecting...');
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.location.pathname !== '/') {
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new CustomEvent('akinoya-navigate-home'));
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
            closeAuthModal();
            setMode('signin');
          }, 1500);
        }
      } else {
        const res = await signInWithEmail(email, password);
        if (!res.success) {
          setError(res.error || 'Invalid email or password.');
          soundManager.playError();
        } else {
          setSuccess('Signed in successfully! Loading your session...');
          if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new CustomEvent('akinoya-navigate-home'));
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
          closeAuthModal();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
      soundManager.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 overflow-y-auto">
        {/* Backdrop click */}
        <div className="fixed inset-0" onClick={closeAuthModal} />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full sm:max-w-md bg-[#050811] border-t sm:border border-cyan-500/30 rounded-t-3xl sm:rounded-2xl p-5 sm:p-7 shadow-[0_0_50px_rgba(56,189,248,0.2)] overflow-hidden my-0 sm:my-auto"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar / Close Button */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-display font-extrabold tracking-wider text-white uppercase">
                SILLOW MILL · AUTH GATEWAY
              </span>
            </div>

            <button
              type="button"
              onClick={closeAuthModal}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Already Claimed / Other Account VIP Link Notice Banner */}
          {vipLinkError && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-red-950/90 via-rose-950/85 to-red-950/90 border border-red-500/60 text-red-200 shadow-[0_0_25px_rgba(239,68,68,0.3)] flex items-start gap-3 select-none">
              <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-xs font-mono font-bold tracking-wider uppercase text-red-400">
                  Pass already claimed
                </div>
                <p className="text-xs text-red-200 font-sans mt-1 leading-relaxed font-semibold">
                  {vipLinkError}
                </p>
              </div>
            </div>
          )}

          {/* Active VIP Referral / Pass Invitation Banner */}
          {!vipLinkError && (hasPendingVipInvitation || (typeof window !== 'undefined' && Boolean(localStorage.getItem('akinoya_pending_vip_pass')))) && (
            <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 via-emerald-950/50 to-cyan-950/60 border border-cyan-500/40 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-cyan-400/20 text-cyan-400 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-cyan-300">
                    VIP Invitation Active
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold bg-cyan-400 text-black">
                    {(typeof window !== 'undefined' && localStorage.getItem('akinoya_pending_vip_pass')) || 'VIP_GUEST'}
                  </span>
                </div>
                <p className="text-xs text-cyan-100/90 font-sans mt-1 leading-relaxed">
                  {(typeof window !== 'undefined' && localStorage.getItem('akinoya_pending_vip_pass'))
                    ? `Founding Pass #${localStorage.getItem('akinoya_pending_vip_pass')} detected. Sign in or create an account to permanently claim VIP ownership and generate your Certificate of Authenticity.`
                    : 'You were invited as a VIP Guest. Continue with Google or register to claim instant access to Creator Lab channels, exclusive audio masters & visualizers.'}
                </p>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs: Strictly 2 Clean Tabs (grid-cols-2) */}
          {(mode === 'signin' || mode === 'signup') && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#080d1a] rounded-xl border border-white/10 mt-4">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccess(null);
                  setConfirmPassword('');
                  setShowConfirmPassword(false);
                  soundManager.playTone(560, 0.04);
                }}
                className={`min-h-[48px] py-2 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'signin'
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(56,189,248,0.35)] font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setSuccess(null);
                  setConfirmPassword('');
                  setShowConfirmPassword(false);
                  soundManager.playTone(560, 0.04);
                }}
                className={`min-h-[48px] py-2 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'signup'
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(56,189,248,0.35)] font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* Password Reset Header */}
          {mode === 'reset' && (
            <div className="mt-4 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-left space-y-1">
              <div className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Password Recovery</span>
              </div>
              <p className="text-[11px] font-sans text-white/60 leading-relaxed">
                Enter your account email below to receive a secure password reset link.
              </p>
            </div>
          )}

          {/* Password Update Header */}
          {mode === 'update_password' && (
            <div className="mt-4 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-left space-y-1">
              <div className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Set New Password</span>
              </div>
              <p className="text-[11px] font-sans text-white/60 leading-relaxed">
                Create a secure new password for your Sillow Mill profile.
              </p>
            </div>
          )}

          {/* Sign In / Register / Recovery Form */}
          <div className="space-y-4 mt-5">
            {/* Top Action: Official Continue with Google Button */}
            {(mode === 'signin' || mode === 'signup') && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-black font-sans font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-[1.01] active:scale-[0.99] border border-white/20"
                >
                  {/* Official Google G Logo SVG */}
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

                {/* Minimalist Divider */}
                <div className="relative flex items-center justify-center my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <span className="relative px-3 bg-[#050811] text-[10px] font-mono tracking-wider text-white/40 uppercase">
                    OR SIGN {mode === 'signup' ? 'UP' : 'IN'} WITH EMAIL
                  </span>
                </div>
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* First Name & Last Name (Side-by-side on desktop ≥640px, stacked on mobile <640px) */}
              {mode === 'signup' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-white/70 block">
                      First Name <span className="text-cyan-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Voornaam"
                        className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#080d1a] border border-white/15 focus:border-cyan-400 text-white text-xs sm:text-sm font-sans outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-white/70 block">
                      Last Name <span className="text-white/40">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Achternaam"
                        className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[#080d1a] border border-white/15 focus:border-cyan-400 text-white text-xs sm:text-sm font-sans outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Address */}
              {mode !== 'update_password' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-white/70 block">
                    Email Address <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-white/40 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="pilot@sillowmill.com"
                      className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 rounded-xl bg-[#080d1a] border border-white/15 focus:border-cyan-400 text-white text-xs sm:text-sm font-sans outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Password Input */}
              {mode !== 'reset' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-white/70 block">
                    {mode === 'update_password' ? 'New Password' : 'Password'} <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-4 h-4 text-white/40 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={mode === 'signup' || mode === 'update_password' ? 8 : 6}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="••••••••"
                      className="w-full min-h-[48px] pl-10 pr-10 py-2.5 rounded-xl bg-[#080d1a] border border-white/15 focus:border-cyan-400 text-white text-xs sm:text-sm font-sans outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-white/40 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Forgot Password Link on Sign In */}
                  {mode === 'signin' && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setError(null);
                          setSuccess(null);
                          soundManager.playTone(560, 0.04);
                        }}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password Input & Real-Time UX Feedback (Register and Update Password modes) */}
              {(mode === 'signup' || mode === 'update_password') && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-white/70 block">
                    {mode === 'update_password' ? 'Confirm New Password' : 'Confirm Password'} <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-4 h-4 text-white/40 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="••••••••"
                      className={`w-full min-h-[48px] pl-10 pr-10 py-2.5 rounded-xl bg-[#080d1a] border ${
                        confirmPassword.length > 0 && !passwordsMatch
                          ? 'border-rose-500/60 focus:border-rose-400'
                          : passwordsMatch
                          ? 'border-emerald-500/60 focus:border-emerald-400'
                          : 'border-white/15 focus:border-cyan-400'
                      } text-white text-xs sm:text-sm font-sans outline-none transition-colors`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 text-white/40 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Real-time UX Password Validation Checklist */}
                  <div className="pt-1.5 pb-0.5 px-0.5 space-y-1.5 text-[11px] font-mono">
                    <div
                      className={`flex items-center gap-2 transition-colors ${
                        hasMinLength
                          ? 'text-emerald-400 font-medium'
                          : password.length > 0
                          ? 'text-white/60'
                          : 'text-white/40'
                      }`}
                    >
                      {hasMinLength ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0 ml-1 mr-1" />
                      )}
                      <span>• At least 8 characters</span>
                    </div>

                    <div
                      className={`flex items-center gap-2 transition-colors ${
                        hasSpecialChar
                          ? 'text-emerald-400 font-medium'
                          : password.length > 0
                          ? 'text-white/60'
                          : 'text-white/40'
                      }`}
                    >
                      {hasSpecialChar ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0 ml-1 mr-1" />
                      )}
                      <span>• At least 1 special character</span>
                    </div>

                    <div
                      className={`flex items-center gap-2 transition-colors ${
                        passwordsMatch
                          ? 'text-emerald-400 font-medium'
                          : confirmPassword.length > 0
                          ? 'text-rose-400 font-medium'
                          : 'text-white/40'
                      }`}
                    >
                      {passwordsMatch ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : confirmPassword.length > 0 ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0 ml-1 mr-1" />
                      )}
                      <span>• Passwords match</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs font-sans flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Banner */}
              {success && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-sans flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] mt-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-black font-mono font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'signup'
                        ? 'CREATE FREE ACCOUNT'
                        : mode === 'reset'
                        ? 'SEND PASSWORD RESET LINK'
                        : mode === 'update_password'
                        ? 'UPDATE PASSWORD'
                        : 'SIGN IN TO PORTAL'}
                    </span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              {/* Back to sign in link for recovery or update password modes */}
              {(mode === 'reset' || mode === 'update_password') && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setError(null);
                      setSuccess(null);
                      soundManager.playTone(560, 0.04);
                    }}
                    className="text-xs font-mono text-white/60 hover:text-white transition-colors cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* GDPR / Privacy Compliance Footer */}
          <div className="mt-5 pt-3 border-t border-white/5 text-center text-[10px] font-mono text-white/40 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>100% GDPR / AVG Compliant · Salted Auth &amp; Encrypted Sync</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
