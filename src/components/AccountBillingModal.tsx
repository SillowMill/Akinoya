import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  X,
  ShieldCheck,
  Crown,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../utils/audio';

export interface AccountBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountBillingModal: React.FC<AccountBillingModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, role, isVip, isSubscriber, signOut, openAuthModal } = useAuth();

  const [showPreferences, setShowPreferences] = useState(false);
  const [cancellationStep, setCancellationStep] = useState<'idle' | 'confirm' | 'cancelled'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingPortal, setIsProcessingPortal] = useState(false);

  // Dynamic renewal date calculation (1 year from recorded renewal date or account creation)
  const renewalDateText = React.useMemo(() => {
    if (profile?.subscription_renewal_date) {
      try {
        return new Date(profile.subscription_renewal_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {}
    }
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [profile?.subscription_renewal_date]);

  // Reset cancellation step when opened
  useEffect(() => {
    if (isOpen) {
      const isLocallyCancelled = localStorage.getItem('akinoya_renewal_preference') === 'cancelled';
      if (profile?.subscription_cancel_at_period_end || isLocallyCancelled) {
        setCancellationStep('cancelled');
      } else {
        setCancellationStep('idle');
      }
      setShowPreferences(false);
    }
  }, [isOpen, profile?.subscription_cancel_at_period_end]);

  // Listen to escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isPaidMember = isSubscriber || role === 'ANNUAL_PASS' || role === 'SUBSCRIBER';
  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'Pioneer Pilot';
  const email = profile?.email || user?.email || 'pioneer@sillowmill.com';

  const handleCancelAutoRenewal = async () => {
    setIsProcessing(true);
    soundManager.playTone(440, 0.05);

    try {
      await fetch('/api/subscription/cancel-renewal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        body: JSON.stringify({ email }),
      });
      localStorage.setItem('akinoya_renewal_preference', 'cancelled');
    } catch (err) {
      console.warn('[Billing] Cancel renewal request note:', err);
    }

    setIsProcessing(false);
    setCancellationStep('cancelled');
    soundManager.playTone(520, 0.08);
  };

  const handleReactivateRenewal = async () => {
    setIsProcessing(true);
    soundManager.playTone(660, 0.05);

    try {
      await fetch('/api/subscription/reactivate-renewal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        body: JSON.stringify({ email }),
      });
      localStorage.removeItem('akinoya_renewal_preference');
    } catch (err) {
      console.warn('[Billing] Reactivate renewal request note:', err);
    }

    setIsProcessing(false);
    setCancellationStep('idle');
    soundManager.playTone(720, 0.08);
  };

  const handleOpenStripePortal = async () => {
    setIsProcessingPortal(true);
    soundManager.playTone(600, 0.05);
    try {
      const res = await fetch('/api/subscription/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.warn('[Billing] Failed to initialize Stripe portal:', err);
    } finally {
      setIsProcessingPortal(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 14 }}
        transition={{ duration: 0.2 }}
        style={{
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          willChange: 'transform, opacity',
        }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#0a1226] via-[#070c18] to-[#04060c] border border-cyan-500/40 p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(56,189,248,0.2)] text-white font-sans space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Subtle Ambient Top Border Glow */}
        <div className="absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 via-amber-300 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-display font-black text-white tracking-wide">
                Account &amp; Billing Settings
              </h3>
              <p className="text-[11px] font-mono text-cyan-300/80">
                Subscription preferences &amp; secure Stripe billing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Identifier Card */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-white truncate">
              {displayName}
            </div>
            <div className="text-[10.5px] font-mono text-white/60 truncate">
              {email}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-1 rounded-full bg-cyan-400/20 border border-cyan-400/50 text-cyan-300">
              {role || 'PIONEER'}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* NEVER LOSE YOUR FILES GUARANTEE BANNER                   */}
        {/* ======================================================== */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-cyan-950/40 to-emerald-950/60 border border-emerald-400/40 text-emerald-200 space-y-1.5 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono font-extrabold text-xs uppercase tracking-wider text-emerald-300">
              Never Lose Your Files Guarantee Active
            </span>
          </div>
          <p className="text-xs text-white/80 font-sans leading-relaxed">
            Every digital add-on, production stem, DAW preset, and comic edition you acquire is securely locked to your account profile. You can re-download anytime via the <strong>Drive Asset Vault</strong> at zero additional charge.
          </p>
        </div>

        {/* ======================================================== */}
        {/* STRIPE ANNUAL MEMBERSHIP & BILLING DETAILS              */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#080d1c] border border-amber-400/30 space-y-3 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>The Membership Pass</span>
              </span>
              <div className="text-xl sm:text-2xl font-display font-black text-amber-300">
                € 60.00 <span className="text-xs font-mono font-bold text-amber-200/80">/ year</span>
              </div>
            </div>

            <span
              className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full ${
                cancellationStep === 'cancelled'
                  ? 'bg-amber-950/80 border border-amber-400/40 text-amber-300'
                  : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
              }`}
            >
              {cancellationStep === 'cancelled' ? 'Renews until cycle end' : 'Auto-Renewal Active'}
            </span>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/10 text-xs font-sans text-white/80">
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/60 font-mono text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Billing Frequency:</span>
              </span>
              <span className="font-semibold text-white">Annual Recurring (via Stripe)</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-white/60 font-mono text-[11px] flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Next Scheduled Renewal:</span>
              </span>
              <span className="font-semibold text-white">
                {cancellationStep === 'cancelled'
                  ? `Ends ${renewalDateText} (No further charge)`
                  : `${renewalDateText} (€60.00)`}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-white/60 font-mono text-[11px] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Payment Processing:</span>
              </span>
              <span className="font-semibold text-white">Stripe Encrypted (SEPA / Cards)</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-white/60 font-mono text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Galaxy Navigator Deployment:</span>
              </span>
              <span className="font-semibold text-amber-300">Batches Updated Every Monday Morning</span>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-white/50">Direct Debit &amp; Card Management:</span>
              <button
                type="button"
                onClick={handleOpenStripePortal}
                disabled={isProcessingPortal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white border border-cyan-400/30 text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                {isProcessingPortal ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <ExternalLink className="w-3 h-3" />
                )}
                <span>Stripe Billing Portal</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DISCREET & LEGAL SUBSCRIPTION PREFERENCES RETENTION FLOW */}
        {/* ======================================================== */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <button
            type="button"
            onClick={() => {
              soundManager.playTone(560, 0.04);
              setShowPreferences((prev) => !prev);
            }}
            className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-mono font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>Subscription &amp; Renewal Preferences</span>
            </span>
            {showPreferences ? (
              <ChevronUp className="w-4 h-4 text-white/50" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/50" />
            )}
          </button>

          <AnimatePresence>
            {showPreferences && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="p-4 pt-1 border-t border-white/10 space-y-3.5 text-xs font-sans"
              >
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-white/80 space-y-1">
                  <div className="font-bold text-cyan-300 text-[11.5px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Pioneer Member Entitlements</span>
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Your active membership pass includes full Pioneer Lounge channel access (#announcements, #the-vault, #community-feedback), unreleased audio masters, and complete instant vault access throughout the year.
                  </p>
                </div>

                {cancellationStep === 'idle' && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      You may cancel your annual renewal at any time. When cancelled, your membership remains 100% active until the end of your billing cycle. You will never be billed again, and your existing files stay protected forever under our Never Lose Your Files guarantee.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playTone(420, 0.05);
                        setCancellationStep('confirm');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-red-950/40 border border-white/15 hover:border-red-500/40 text-white/70 hover:text-red-300 font-mono text-[11px] transition-all cursor-pointer"
                    >
                      Turn Off Automatic Annual Renewal
                    </button>
                  </div>
                )}

                {cancellationStep === 'confirm' && (
                  <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 space-y-2.5">
                    <div className="flex items-center gap-2 text-red-300 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Confirm Cancellation of Auto-Renewal?</span>
                    </div>
                    <p className="text-[11px] text-red-200/80 leading-relaxed">
                      Your access will remain active until {renewalDateText}. After that date, you will not receive new Pioneer Lounge updates or member perks. All previously unlocked assets remain yours forever.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playTone(660, 0.04);
                          setCancellationStep('idle');
                        }}
                        className="py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-colors cursor-pointer text-center"
                      >
                        Keep Auto-Renewal Active
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleCancelAutoRenewal}
                        className="py-2 px-3 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-mono text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {isProcessing ? 'Processing...' : 'Confirm: Cancel Renewal'}
                      </button>
                    </div>
                  </div>
                )}

                {cancellationStep === 'cancelled' && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-400/40 space-y-2 text-emerald-200">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Auto-Renewal Successfully Cancelled</span>
                    </div>
                    <p className="text-[11px] text-white/80 leading-relaxed">
                      Your card will not be charged again. Your full access remains intact until {renewalDateText}. You can re-enable auto-renewal anytime below.
                    </p>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleReactivateRenewal}
                      className="py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isProcessing ? 'Reactivating...' : 'Re-enable Auto-Renewal'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-white/50 border-t border-white/10">
          <span>Stripe Certified Merchant</span>
          <button
            type="button"
            onClick={onClose}
            className="text-cyan-300 hover:text-white transition-colors cursor-pointer font-bold"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
