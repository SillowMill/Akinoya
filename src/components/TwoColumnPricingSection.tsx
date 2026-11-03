/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MicVocal,
  BookOpen,
  Sliders,
  ShoppingBag,
  Sparkles,
  Check,
  Crown,
  ArrowRight,
  Lock,
  ShieldCheck,
  Layers,
  Info,
  X,
  ExternalLink,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { openMembershipGateModal } from '../utils/pioneer';

export interface TwoColumnPricingSectionProps {
  onSelectComicTab?: () => void;
  onJoinMemberPass?: () => void;
  isMembershipLaunchLocked?: boolean;
  className?: string;
  isLoungeView?: boolean;
  onOpenAuthModal?: () => void;
}

interface AddonModalInfo {
  title: string;
  badge: string;
  price: string;
  description: string;
  features: string[];
}

export const TwoColumnPricingSection: React.FC<TwoColumnPricingSectionProps> = ({
  onSelectComicTab,
  onJoinMemberPass,
  isMembershipLaunchLocked = false,
  className = '',
  isLoungeView = false,
  onOpenAuthModal,
}) => {
  const [activeAddonModal, setActiveAddonModal] = useState<AddonModalInfo | null>(null);

  const handleJoinPassClick = () => {
    soundManager.playTone(660, 0.08);
    if (onJoinMemberPass) {
      onJoinMemberPass();
    } else {
      openMembershipGateModal();
    }
  };

  const handleComicClick = () => {
    soundManager.playTone(620, 0.05);
    if (onSelectComicTab) {
      onSelectComicTab();
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#edition';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  const handleAddonClick = (addon: AddonModalInfo) => {
    soundManager.playTone(540, 0.05);
    setActiveAddonModal(addon);
  };

  return (
    <section
      aria-label="Pricing and Membership Options"
      className={`w-full max-w-7xl mx-auto space-y-6 transform-gpu ${className}`}
    >
      {/* Optional Top Section Sub-Header (Only shown on homepage to anchor below visualizers) */}
      {!isLoungeView && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-semibold tracking-wider flex items-center gap-1.5 shadow-[0_0_8px_rgba(56,189,248,0.15)]">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                OFFICIAL RELEASES &amp; VAULT
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-semibold">
                ALL DIGITAL EXTRAS INCLUDED IN PASS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-white tracking-wide">
              Packs, Comic &amp; Membership
            </h2>
            <p className="text-xs sm:text-sm font-sans text-white/70 mt-1 max-w-2xl leading-relaxed">
              Order standalone production packs and the physical graphic novel, or join the Annual Member Pass for complete, all-inclusive access.
            </p>
          </div>
        </div>
      )}

      {/* Two-Column Responsive Grid: Side-by-side on desktop (lg:grid-cols-2), cleanly stacked on tablet/mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
        {/* ========================================================= */}
        {/* COLUMN 1: Individual Add-ons & Physical Product            */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between rounded-3xl bg-gradient-to-b from-[#090e1a] via-[#060a14] to-[#04070e] border border-white/15 p-5 sm:p-7 lg:p-8 relative overflow-hidden shadow-2xl">
          {/* Subtle Ambient Top Border Highlight */}
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

          <div className="space-y-5">
            {/* Column 1 Header */}
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-300 uppercase px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/30 inline-block mb-2">
                A LA CARTE · INDIVIDUAL PRODUCTS
              </span>
              <h3 className="text-lg sm:text-xl font-display font-bold text-white tracking-wide">
                Individual Add-ons &amp; Physical Product
              </h3>
              <p className="text-xs sm:text-sm font-sans text-white/65 mt-1 leading-relaxed">
                Purchase dedicated production packs separately, or order the limited physical graphic novel.
              </p>
            </div>

            {/* Individual Digital Add-ons: 3 Distinct Cards */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono font-bold tracking-wider text-white/50 uppercase">
                Digital Add-ons
              </div>

              {/* 1. Vocal Acapella & Remix Pack */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5 sm:mt-0">
                    <MicVocal className="w-4 h-4 text-cyan-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-display font-bold text-white group-hover:text-cyan-200 transition-colors">
                        Vocal Acapella &amp; Remix Pack
                      </h4>
                      <span className="text-[9.5px] font-mono text-cyan-300/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20 hidden sm:inline">
                        WAV STEMS
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-white/60 font-sans leading-relaxed">
                      Dry &amp; wet studio acapellas for Track 1 &amp; 2 from the EP.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <span className="text-sm font-mono font-bold text-white">€ 19.99</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddonClick({
                        title: 'Vocal Acapella & Remix Pack',
                        badge: 'STUDIO AUDIO STEMS',
                        price: '€ 19.99',
                        description:
                          'Dry and wet studio vocal stems from Track 1 and Track 2 of the EP, master tempo locked and tuned for remixing and production.',
                        features: [
                          'Master studio vocal leads (Dry & Wet)',
                          'Harmonies, ad-libs, and backing vocoder tracks',
                          '24-bit / 48kHz uncompressed WAV stems',
                          'Also included 100% FREE with the Membership Pass',
                        ],
                      })
                    }
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/15 border border-white/15 hover:border-cyan-400/50 text-white hover:text-cyan-200 text-xs font-mono font-bold transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5"
                  >
                    <span>Pre-Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2. Digital Copy of Bingäa */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5 sm:mt-0">
                    <BookOpen className="w-4 h-4 text-cyan-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-display font-bold text-white group-hover:text-cyan-200 transition-colors">
                        Digital Copy of Bingäa
                      </h4>
                      <span className="text-[9.5px] font-mono text-cyan-300/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20 hidden sm:inline">
                        4K PDF
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-white/60 font-sans leading-relaxed">
                      Complete 48-page graphic novel with interactive viewer &amp; 4K download.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <span className="text-sm font-mono font-bold text-white">€ 9.99</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddonClick({
                        title: 'Digital Copy of Bingäa',
                        badge: '4K GRAPHIC NOVEL',
                        price: '€ 9.99',
                        description:
                          'The full 48-page digital edition of the Bingäa graphic novel in pristine 4K resolution, readable in browser or downloaded as DRM-free PDF.',
                        features: [
                          'Complete 48-page full-color graphic novel',
                          'Interactive dual-page flipbook reader',
                          'High-DPI PDF storyboard edition',
                          'Included FREE with physical comic OR Membership Pass',
                        ],
                      })
                    }
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/15 border border-white/15 hover:border-cyan-400/50 text-white hover:text-cyan-200 text-xs font-mono font-bold transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5"
                  >
                    <span>Pre-Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 3. Complete Production & Workflow Assets */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5 sm:mt-0">
                    <Sliders className="w-4 h-4 text-cyan-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-display font-bold text-white group-hover:text-cyan-200 transition-colors">
                        Complete Production &amp; Workflow Assets
                      </h4>
                      <span className="text-[9.5px] font-mono text-cyan-300/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20 hidden sm:inline">
                        DAW ASSETS
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-white/60 font-sans leading-relaxed">
                      Presets, DAW templates, vocal racks &amp; project breakdowns.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <span className="text-sm font-mono font-bold text-white">€ 29.99</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddonClick({
                        title: 'Complete Production & Workflow Assets',
                        badge: 'DAW PRESETS & TEMPLATES',
                        price: '€ 29.99',
                        description:
                          'The complete production architecture used to create the Äkinoya EP: custom Ableton 12 / Bitwig templates, master vocal chain processing, and project breakdowns.',
                        features: [
                          'Custom DAW project templates (Ableton 12 & Bitwig)',
                          'Vocal chain effects rack presets (FabFilter, UAD, Native)',
                          '10-minute workflow breakdown screencasts with Odi',
                          'Also included 100% FREE with the Membership Pass',
                        ],
                      })
                    }
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/15 border border-white/15 hover:border-cyan-400/50 text-white hover:text-cyan-200 text-xs font-mono font-bold transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5"
                  >
                    <span>Pre-Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Physical Product Section */}
            <div className="pt-2">
              <div className="relative rounded-2xl bg-gradient-to-br from-cyan-950/50 via-[#061122] to-black border-2 border-cyan-400/40 p-4 sm:p-5 space-y-3.5 overflow-hidden shadow-[0_0_25px_rgba(56,189,248,0.12)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 tracking-wider">
                    PHYSICAL PRODUCT · COLLECTOR'S ITEM
                  </span>
                  <span className="text-base font-display font-extrabold text-cyan-300">€ 14.99</span>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-sm sm:text-base font-display font-black text-white tracking-wide">
                    The Physical Bingäa Comic Book (€ 14.99)
                  </h4>
                  <p className="text-xs font-sans text-emerald-300 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Includes the Digital Copy of Bingäa for free!</span>
                  </p>
                  <p className="text-[11px] sm:text-xs text-white/65 font-sans leading-relaxed">
                    First edition collector's softcover print (48 pages, 170gsm matte art paper) with authenticated QR token. Wave 2 allocation with free EU express delivery.
                  </p>
                </div>

                {/* Primary CTA: View Comic & Order */}
                <button
                  type="button"
                  onClick={handleComicClick}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[46px]"
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>View Comic &amp; Order</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/5 text-[10.5px] font-mono text-white/45 flex items-center justify-between">
            <span>DRM-Free Personal License</span>
            <span>All digital items included in Pass →</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: The Membership Pass (€ 60 / year) – All Included */}
        {/* ========================================================= */}
        <div className="relative flex flex-col justify-between rounded-3xl bg-gradient-to-b from-[#100d05] via-[#090804] to-black border-2 border-amber-400/80 p-5 sm:p-7 lg:p-8 overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.22)]">
          {/* Top Gold Glowing Highlight Bar */}
          <div className="absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300 via-yellow-400 to-transparent pointer-events-none" />

          {/* Floating Best Value Badge */}
          <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 text-black text-[10px] sm:text-[11px] font-mono font-black tracking-wider uppercase shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <Crown className="w-3.5 h-3.5 fill-black text-black shrink-0" />
              <span>ALL-INCLUSIVE PASS</span>
            </span>
          </div>

          <div className="space-y-5">
            {/* Column 2 Header */}
            <div className="pr-24 sm:pr-28">
              <span className="text-[10px] font-mono font-extrabold tracking-widest text-amber-300 uppercase px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-400/50 inline-block mb-2">
                SMARTEST CHOICE · MAXIMUM VALUE
              </span>
              <h3 className="text-xl sm:text-2xl font-display font-black text-white tracking-wide">
                The Membership Pass
              </h3>
              <p className="text-xs sm:text-sm font-sans text-amber-100/70 mt-1 leading-relaxed">
                Everything unlocked in one single pass. All digital extras and monthly drops included.
              </p>
            </div>

            {/* Price Presentation (Crystal Clear, Large, High-End Typography) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#151105] to-black border border-amber-400/40 space-y-2">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-amber-300 tracking-tight drop-shadow-[0_2px_15px_rgba(245,158,11,0.35)]">
                  € 60
                </span>
                <span className="text-xs sm:text-sm font-mono text-amber-200/80 font-bold uppercase tracking-wider">
                  / year (~€ 5 / month)
                </span>
              </div>
              <div className="text-[11px] sm:text-xs font-mono text-emerald-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Separate digital total is €70.97+ · Save immediately on day one</span>
              </div>
            </div>

            {/* Content List: All-Inclusive Extras */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-mono font-bold tracking-wider text-amber-300/80 uppercase">
                All Digital Extras Included:
              </div>

              <ul className="space-y-2 text-xs sm:text-[13px] text-white/85 font-sans">
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Vocal Acapella &amp; Remix Pack</strong> (Included free)
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Digital Copy of Bingäa</strong> (Full 4K graphic novel included)
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Complete Production &amp; Workflow Assets</strong> (Presets, DAW templates, breakdowns)
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">11 Reactive Visualizer Breakdowns</strong> (4K telemetry &amp; acoustic logs)
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Unreleased Audio Masters &amp; 4K Assets</strong> (Stems, concept art &amp; 3D models)
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Exclusive Pioneer Lounge</strong> (Access to #announcements, #the-vault &amp; #community-feedback)
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Monthly Curated Drops</strong> (Fresh drops every month starting January 9, 2027)
                  </span>
                </li>
              </ul>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-sans text-amber-200/70 italic">
                * All digital extras are fully all-inclusive (excluding physical shipping of the comic book).
              </div>
            </div>

            {/* Stunning Gold-Highlighted CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleJoinPassClick}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-black font-mono font-black text-sm sm:text-base tracking-wide shadow-[0_0_35px_rgba(245,158,11,0.5)] hover:shadow-[0_0_50px_rgba(245,158,11,0.7)] transition-all cursor-pointer flex items-center justify-center gap-2.5 min-h-[52px] transform-gpu hover:scale-[1.015]"
              >
                <Crown className="w-5 h-5 fill-black text-black shrink-0" />
                <span>Join Member Pass</span>
                <ArrowRight className="w-5 h-5 text-black shrink-0" />
              </button>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-amber-500/20 text-[10.5px] font-mono text-amber-200/60 flex items-center justify-between">
            <span>Instant Access Upon Launch</span>
            <span>Secure Checkout with Stripe</span>
          </div>
        </div>
      </div>

      {/* Add-on Detail & Pre-Order Modal */}
      <AnimatePresence>
        {activeAddonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-[#070b14] border border-cyan-400/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4"
            >
              <button
                type="button"
                onClick={() => setActiveAddonModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                  {activeAddonModal.badge}
                </span>
                <h3 className="text-lg sm:text-xl font-display font-bold text-white pt-1">
                  {activeAddonModal.title}
                </h3>
                <div className="text-xl font-display font-extrabold text-cyan-300">
                  {activeAddonModal.price}
                </div>
              </div>

              <p className="text-xs sm:text-sm text-white/75 font-sans leading-relaxed">
                {activeAddonModal.description}
              </p>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[10.5px] font-mono font-bold text-white/50 uppercase">
                  Included in this pack:
                </span>
                <ul className="space-y-1.5 text-xs text-white/80 font-sans">
                  {activeAddonModal.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro-tip: Included in Member Pass */}
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-400/30 space-y-1 text-xs">
                <div className="font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Pro-tip: Included in Member Pass</span>
                </div>
                <p className="text-white/70 font-sans text-[11.5px]">
                  Join the Membership Pass (€60/year) to receive this pack plus all other digital extras and monthly drops for free.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAddonModal(null);
                    handleJoinPassClick();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                >
                  <Crown className="w-4 h-4" />
                  <span>Get with Pass (€60/yr)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveAddonModal(null);
                    alert(
                      `${activeAddonModal.title} standalone pre-orders unlock on launch day (January 9, 2027). You can secure access today with the Membership Pass.`
                    );
                  }}
                  className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-mono text-xs cursor-pointer text-center"
                >
                  Pre-Order Pack Only
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default TwoColumnPricingSection;
