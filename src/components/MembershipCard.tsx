/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Crown, Sparkles, Check, ShieldCheck, ArrowRight } from 'lucide-react';
import { triggerMemberPassCheckout } from '../utils/pioneer';

export interface MembershipCardProps {
  className?: string;
  onCheckout?: () => void;
}

/**
 * MembershipCard — The Membership Pass presentation component highlighting
 * perpetual content evolution, automated vault updates, and full Pioneer benefits.
 */
export const MembershipCard: React.FC<MembershipCardProps> = ({
  className = '',
  onCheckout,
}) => {
  const handleJoinPass = () => {
    if (onCheckout) {
      onCheckout();
    } else {
      triggerMemberPassCheckout();
    }
  };

  return (
    <div
      className={`relative rounded-3xl bg-[#090e1c] border-2 border-amber-400/80 p-6 sm:p-8 space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-left ${className}`}
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-400/60 text-amber-300 font-mono text-[11px] font-extrabold tracking-wider">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>ALL-INCLUSIVE MEMBERSHIP PASS</span>
        </span>
        <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-400/30 text-cyan-300 font-mono text-[10px] font-semibold">
          VAULT AUTO-SYNC
        </span>
      </div>

      {/* Header */}
      <div>
        <h3 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wide">
          The Membership Pass
        </h3>
        <p className="text-xs sm:text-sm font-sans text-amber-100/75 mt-1 leading-relaxed">
          Everything unlocked in one single pass. All digital extras, stems, and continuous vault access included.
        </p>
      </div>

      {/* Pricing Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-display font-black text-amber-300 tracking-tight">
            €60
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 font-mono text-xs font-bold uppercase">
            €60 PER YEAR
          </span>
          <span className="text-amber-200/70 font-mono text-xs">
            (~ €5 PER MONTH)
          </span>
        </div>
        <div className="text-xs font-mono text-emerald-300 flex items-center gap-1.5 font-bold">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Perpetual ecosystem · Never pay for individual releases</span>
        </div>
      </div>

      {/* Bullet List */}
      <div className="space-y-3">
        <div className="text-[11px] font-mono font-bold tracking-wider text-amber-300/80 uppercase">
          All Digital Extras Included:
        </div>

        <ul className="space-y-2.5 text-xs sm:text-[13px] text-white/85 font-sans leading-relaxed">
          <li className="flex items-start gap-2.5">
            <span className="w-4 h-4 rounded-full bg-cyan-400/25 border border-cyan-400/80 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black shadow-[0_0_8px_rgba(34,211,238,0.4)]">
              ✓
            </span>
            <span>
              <strong className="text-cyan-300">Continuous Vault Hub Access:</strong> Automatic, real-time inclusion of all future releases, new production workflows, vocal acapella &amp; remix packs, and upcoming comic book chapters pushed directly to your account asset vault — a perpetually growing ecosystem without ever needing to re-purchase or manually sync future updates.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="w-4 h-4 rounded-full bg-cyan-400/20 border border-cyan-400/70 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
              ✓
            </span>
            <span>
              <strong className="text-cyan-300">Instant Access:</strong> Instantly unlocked and securely stored in your <strong className="text-white">Asset Vault inside the Hub</strong> upon purchase.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
              ✓
            </span>
            <span>
              <strong className="text-white">Synthesize &amp; Feature Your World:</strong> Custom planet co-creation, 4K render dossier, video trailer loop &amp; future cinematic visualizer co-creation feature slot included.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
              ✓
            </span>
            <span>
              <strong className="text-white">Vocal Acapella &amp; Remix Pack:</strong> Studio stems and WAV multi-tracks.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
              ✓
            </span>
            <span>
              <strong className="text-white">Digital Copy of Bingäa:</strong> Complete 4K interactive graphic novel.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
              ✓
            </span>
            <span>
              <strong className="text-white">Workflow:</strong> Visualizer workflow, vocal chain &amp; Logic Pro template.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
              ✓
            </span>
            <span>
              <strong className="text-white">Pioneer Lounge &amp; Governance Votes:</strong> VIP channels and release co-direction.
            </span>
          </li>
        </ul>
      </div>

      {/* CTA Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleJoinPass}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-black font-mono font-black text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.5)] cursor-pointer active:scale-[0.99]"
        >
          <Sparkles className="w-4 h-4 text-black shrink-0" />
          <span>JOIN ANNUAL MEMBER PASS (€60/YR) →</span>
          <ArrowRight className="w-4 h-4 text-black shrink-0" />
        </button>
      </div>
    </div>
  );
};

export default MembershipCard;
