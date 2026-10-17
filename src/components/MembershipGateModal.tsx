/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Sparkles,
  ShieldCheck,
  Globe2,
  Crown,
  Layers,
  X,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export interface MembershipGateModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const MembershipGateModal: React.FC<MembershipGateModalProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  useEffect(() => {
    const handleGlobalOpen = () => {
      setInternalIsOpen(true);
      soundManager.playTone(440, 0.08);
    };

    window.addEventListener('akinoya-open-membership-gate', handleGlobalOpen);
    return () => window.removeEventListener('akinoya-open-membership-gate', handleGlobalOpen);
  }, []);

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleUpgradeCheckout = async () => {
    soundManager.playTone(660, 0.08);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'membership',
          product: 'community_membership',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }

      // If backend reports checkout locked or offline, notify user politely
      alert('Annual Membership public checkout is initializing. For immediate manual provisioning, please contact Odi@sillowmill.com');
    } catch {
      alert('Unable to connect to membership checkout. Please contact Odi@sillowmill.com');
    }
  };

  if (!isModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/95">
        <div className="fixed inset-0 pointer-events-auto" onClick={handleClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-xl w-full bg-[#050812] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.3)] overflow-hidden my-auto space-y-6"
        >
          {/* Subtle Ambient Gold Accents */}
          <div className="absolute top-0 right-0 w-56 h-56 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer z-20"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-400/60 text-amber-300 font-mono text-[10.5px] sm:text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>POST-LAUNCH MEMBERSHIP REQUIRED</span>
              </span>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-400/30 text-cyan-300 tracking-wider font-semibold">
                OFFICIAL LAUNCH: JAN 9, 2027
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight uppercase">
              Annual Membership
            </h2>

            <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
              The pre-launch Pioneer early-access window has concluded. Planetary sector claims, 5-photo high-resolution AI synthesis with Mill, and restricted community channels now require an active Annual Membership (€60/year).
            </p>
          </div>

          {/* Entitlements Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#090e1e] border border-amber-500/30 space-y-3.5 shadow-inner">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                Full Pioneer Entitlements Included:
              </span>
              <span className="text-xs font-mono font-black text-white">
                €60 / YEAR <span className="text-white/50 font-normal">(~€5/mo)</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono text-white/80">
              <div className="flex items-start gap-2">
                <Globe2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Sovereign Sector Reservation &amp; Telemetry</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Mill 5-Photo Cinematic AI Synthesis</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Worldbuilding Contest &amp; Governance Votes</span>
              </div>
              <div className="flex items-start gap-2">
                <Crown className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <span>Creator Channels &amp; High-Res Asset Vault</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleUpgradeCheckout}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-black font-mono font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Upgrade to Annual Membership (€60/year)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-mono font-semibold text-xs transition-colors cursor-pointer text-center"
            >
              Return to Public Lore Archive
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
