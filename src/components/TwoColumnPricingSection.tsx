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
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  Users,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { openMembershipGateModal } from '../utils/pioneer';
import { useAuth } from '../context/AuthContext';
import bingaaComicCover from '../assets/images/bingaa_comic_cover.jpg';

export interface TwoColumnPricingSectionProps {
  onSelectComicTab?: () => void;
  onOpenComicReader?: () => void;
  onJoinMemberPass?: () => void;
  isMembershipLaunchLocked?: boolean;
  className?: string;
  isLoungeView?: boolean;
  onOpenAuthModal?: () => void;
  onNavigateToCommunity?: () => void;
}

interface AddonProduct {
  id: string;
  title: string;
  badge: string;
  priceValue: string;
  category: string;
  subtitle: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const ADDON_PRODUCTS: AddonProduct[] = [
  {
    id: 'vocal',
    title: 'Vocal Acapella & Remix Pack',
    badge: 'STUDIO AUDIO STEMS',
    priceValue: '19.99',
    category: 'WAV STEMS',
    subtitle: 'Studio Acapellas of the whole "Dream of Akainoya" tracklist.',
    description:
      'Studio Acapellas of the whole "Dream of Akainoya" tracklist. Dry and wet studio vocal stems, master tempo locked and tuned for remixing and production.',
    features: [
      'Master studio vocal leads (Dry & Wet)',
      'Harmonies, ad-libs, and backing vocoder tracks',
      '24-bit / 48kHz uncompressed WAV stems',
    ],
    icon: MicVocal,
  },
  {
    id: 'comic-digital',
    title: 'Digital Copy of Bingäa',
    badge: '4K GRAPHIC NOVEL',
    priceValue: '9.99',
    category: '4K PDF',
    subtitle: 'Complete graphic novel with interactive viewer & 4K download.',
    description:
      'The complete digital edition of the Bingäa graphic novel in pristine 4K resolution, readable in browser or downloaded as DRM-free PDF.',
    features: [
      'Complete full-color graphic novel',
      'Interactive dual-page flipbook reader',
      'High-DPI PDF storyboard edition',
      'Instant browser reader + DRM-free 4K download',
    ],
    icon: BookOpen,
  },
  {
    id: 'logic-visualizer',
    title: '2D Visualizer Production & Logic Pro Assets',
    badge: '2D VISUALIZER WORKFLOW & LOGIC PRO',
    priceValue: '29.99',
    category: 'VISUALIZERS & LOGIC PRO',
    subtitle: 'Official 2D visualizer workflow, vocal chain & dedicated Logic Pro template.',
    description:
      'Full access to the official Community Hub workflow (the Äkinoya workflow), including the 2D visualizer production pipeline, vocal chain (my vocal chain), and dedicated Logic Pro template. (Excludes the separate Vocal Acapella & Remix Pack).',
    features: [
      'Official Community Hub workflow access (the Äkinoya workflow)',
      'Dedicated Logic Pro template with vocal chain (my vocal chain)',
      '2D Visualizer behind-the-scenes production pipeline',
      '01 · Storyboards & Script Blueprints (2.39:1 framing specs)',
      '02 · Art Direction & Character Anchors (Turnarounds & moodboards)',
      '03 · Blender 3D Previs & Cockpit Rigs (.blend rigs & geometry nodes)',
      '04 · Audio Masters & Stems (excludes standalone Acapella Pack)',
      '05 · Prompt Engineering Bibles (VFX & cinematic prompt parameters)',
    ],
    icon: Sliders,
  },
];

export const TwoColumnPricingSection: React.FC<TwoColumnPricingSectionProps> = ({
  onSelectComicTab,
  onOpenComicReader,
  onJoinMemberPass,
  isMembershipLaunchLocked = false,
  className = '',
  isLoungeView = false,
  onOpenAuthModal,
  onNavigateToCommunity,
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [expandedAddonId, setExpandedAddonId] = useState<string | null>(null);
  const [reservationNotice, setReservationNotice] = useState<string | null>(null);

  const handleCommunityClick = () => {
    soundManager.playTone(600, 0.04);
    if (onNavigateToCommunity) {
      onNavigateToCommunity();
      return;
    }
    try {
      window.history.pushState({}, '', '/community');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      window.location.assign('/community');
    }
  };

  const handleJoinPassClick = () => {
    soundManager.playTone(660, 0.08);
    if (!isAuthenticated) {
      if (onOpenAuthModal) {
        onOpenAuthModal();
      } else {
        openAuthModal(
          'signup',
          'Create your account to secure your purchases with our Never Lose Your Files guarantee.'
        );
      }
      return;
    }
    if (onJoinMemberPass) {
      onJoinMemberPass();
    } else {
      openMembershipGateModal();
    }
  };

  const handleComicClick = () => {
    soundManager.playTone(620, 0.05);
    if (onOpenComicReader) {
      onOpenComicReader();
      return;
    }
    if (!isAuthenticated) {
      if (onOpenAuthModal) {
        onOpenAuthModal();
      } else {
        openAuthModal(
          'signup',
          'Create your account to secure your purchases with our Never Lose Your Files guarantee.'
        );
      }
      return;
    }
    if (onSelectComicTab) {
      onSelectComicTab();
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#edition';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  const toggleExpandAddon = (id: string) => {
    soundManager.playTone(540, 0.04);
    setExpandedAddonId((prev) => (prev === id ? null : id));
  };

  return (
    <section
      aria-label="Pricing and Membership Options"
      className={`w-full max-w-7xl mx-auto space-y-6 transform-gpu ${className}`}
    >
      {/* Reservation Toast Notice */}
      <AnimatePresence>
        {reservationNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-between gap-3 text-emerald-200 text-xs sm:text-sm font-mono"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{reservationNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setReservationNotice(null)}
              className="p-1 rounded-md text-emerald-400/70 hover:text-emerald-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgraded Solid Frosted Glass Header Banner: Optimal Rich Dark Backing, Zero Typography Bleed */}
      {!isLoungeView && (
        <div className="rounded-3xl bg-[#060a14]/95 backdrop-blur-2xl border border-cyan-500/30 p-5 sm:p-6 md:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(56,189,248,0.12)] relative overflow-hidden">
          {/* Subtle Ambient Gold & Cyan Dual-Glow Beam */}
          <div className="absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 via-amber-300 to-transparent pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  OFFICIAL RELEASES &amp; VAULT
                </span>
                <span className="text-[10px] font-mono text-amber-300 font-bold px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-400/40">
                  ALL DIGITAL EXTRAS INCLUDED IN PASS
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-white tracking-wide">
                Packs, Comic &amp; Membership
              </h2>
              <p className="text-xs sm:text-sm font-sans text-white/75 max-w-2xl leading-relaxed">
                Order standalone production packs and the physical graphic novel, or join the Annual Member Pass for complete, all-inclusive access.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              {/* Luminous Cyberpunk Blue Community Hub Action Button */}
              <button
                type="button"
                onClick={handleCommunityClick}
                className="group relative px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-950/90 via-blue-950/85 to-indigo-950/90 hover:from-cyan-900/90 hover:to-indigo-900/90 text-cyan-200 hover:text-white border-2 border-cyan-400/60 hover:border-cyan-300 font-mono font-extrabold text-xs shadow-[0_0_22px_rgba(56,189,248,0.35)] hover:shadow-[0_0_32px_rgba(56,189,248,0.55)] transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xl active:scale-[0.98]"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300" />
                </span>
                <Users className="w-3.5 h-3.5 text-cyan-300 group-hover:scale-110 transition-transform duration-200 shrink-0" />
                <span className="tracking-wider uppercase whitespace-nowrap">Community Hub</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-300/80 group-hover:translate-x-0.5 transition-transform duration-200 shrink-0" />
              </button>

              {/* Join Member Pass Button */}
              <button
                type="button"
                onClick={handleJoinPassClick}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-black font-mono font-black text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Crown className="w-3.5 h-3.5 fill-black text-black shrink-0" />
                <span className="whitespace-nowrap inline-flex items-baseline gap-1">
                  <span>Join Member Pass ·</span>
                  <span>€</span>
                  <span>60/yr</span>
                </span>
              </button>
            </div>
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

            {/* Total A La Carte Comparative Worth Banner (Marketing Pricing Trigger) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 shadow-inner">
              <div className="space-y-1 min-w-0">
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-cyan-300 font-extrabold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Combined Separate Value</span>
                </div>
                <p className="text-[11.5px] sm:text-xs text-white/75 font-sans leading-relaxed">
                  Total of all 3 digital packs + physical comic bought separately:
                </p>
              </div>

              {/* Clean Vertical Hierarchy: Total price on its own clear line, qualifying text underneath */}
              <div className="pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10 flex flex-col items-start sm:items-end justify-center shrink-0">
                <div className="text-2xl sm:text-3xl font-display font-black text-white line-through decoration-rose-400 decoration-2 tracking-tight">
                  € 74.96
                </div>
                <div className="text-[11px] sm:text-xs font-mono text-cyan-300/90 font-medium pt-0.5">
                  (Digital add-ons alone: <span className="font-bold text-white">€ 70.97+</span>)
                </div>
              </div>
            </div>

            {/* Individual Digital Add-ons: 3 Distinct Cards with Clean Inline Drawer Expansion (Zero Modals) */}
            <div className="space-y-3">
              {ADDON_PRODUCTS.map((addon) => {
                const IconComponent = addon.icon;
                const isExpanded = expandedAddonId === addon.id;
                return (
                  <div
                    key={addon.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-400/40 transition-colors space-y-3 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5 sm:mt-0">
                          <IconComponent className="w-4 h-4 text-cyan-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-display font-bold text-white group-hover:text-cyan-200 transition-colors">
                              {addon.title}
                            </h4>
                            <span className="text-[9.5px] font-mono text-cyan-300/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
                              {addon.category}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-white/60 font-sans leading-relaxed">
                            {addon.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                        <span className="text-sm font-mono font-bold text-white whitespace-nowrap inline-flex items-baseline gap-1">
                          <span>€</span>
                          <span>{addon.priceValue}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpandAddon(addon.id)}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5 ${
                            isExpanded
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                              : 'bg-white/5 hover:bg-cyan-500/15 border-white/15 hover:border-cyan-400/50 text-white hover:text-cyan-200'
                          }`}
                        >
                          <span>{isExpanded ? 'Hide Details' : 'Details & Order'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Inline Expandable Drawer: Clean, in-place, zero-modal popup */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pt-3 border-t border-white/10 space-y-3"
                        >
                          <p className="text-xs text-white/80 font-sans leading-relaxed">
                            {addon.description}
                          </p>

                          <div className="space-y-1.5">
                            <span className="text-[10.5px] font-mono font-bold text-white/50 uppercase">
                              Included in this pack:
                            </span>
                            <ul className="space-y-1 text-xs text-white/80 font-sans">
                              {addon.features.map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Smart Choice: Bundled with Member Pass */}
                          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-400/30 space-y-1 text-xs">
                            <div className="font-mono font-bold text-amber-300 flex items-center gap-1.5">
                              <Crown className="w-3.5 h-3.5" />
                              <span>Smart Choice: Bundled with Member Pass</span>
                            </div>
                            <p className="text-white/70 font-sans text-[11.5px]">
                              Get this pack plus all digital extras, stems, and monthly drops bundled into the Annual Member Pass (€60/yr) at a lower overall price.
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playTone(660, 0.05);
                                handleJoinPassClick();
                              }}
                              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] min-h-[40px]"
                            >
                              <Crown className="w-4 h-4 fill-black text-black shrink-0" />
                              <span className="whitespace-nowrap inline-flex items-baseline gap-1">
                                <span>Get with Pass (</span>
                                <span>€</span>
                                <span>60/yr)</span>
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playTone(540, 0.05);
                                if (!isAuthenticated) {
                                  if (onOpenAuthModal) onOpenAuthModal();
                                  else {
                                    openAuthModal(
                                      'signup',
                                      'Create your account to secure your purchases with our Never Lose Your Files guarantee.'
                                    );
                                  }
                                  return;
                                }
                                setReservationNotice(
                                  `${addon.title} (€ ${addon.priceValue}) has been reserved and linked to your account with our 'Never Lose Your Files' guarantee. Complete download bundle unlocks on January 9, 2027.`
                                );
                                setTimeout(() => setReservationNotice(null), 6000);
                              }}
                              className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-mono text-xs cursor-pointer text-center min-h-[40px] whitespace-nowrap inline-flex items-center justify-center gap-1"
                            >
                              <span>Pre-Order Pack Only (</span>
                              <span>€</span>
                              <span>{addon.priceValue})</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Streamlined & Compact Physical Print Collector's Item Widget */}
            <div className="pt-2">
              <div className="rounded-2xl bg-gradient-to-b from-[#09152b] via-[#061122] to-[#040c1a] border-2 border-cyan-400/40 p-3.5 sm:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(56,189,248,0.15)] relative overflow-hidden group">
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />

                <div className="flex items-center gap-3.5 sm:gap-4">
                  {/* Thumbnail (Clickable to open reader) */}
                  <button
                    type="button"
                    onClick={handleComicClick}
                    className="shrink-0 rounded-xl overflow-hidden cursor-pointer group/thumb text-left"
                    aria-label="Open Bingäa comic reader preview"
                  >
                    <img
                      src={bingaaComicCover}
                      alt="Sillow Mill — Bingäa Comic Cover"
                      className="w-16 sm:w-20 md:w-24 h-auto aspect-[3/4] rounded-xl object-cover border border-cyan-400/60 shadow-[0_0_15px_rgba(56,189,248,0.3)] group-hover/thumb:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>

                  {/* Title, Badge, Price & CTA */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[9.5px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 tracking-wider">
                        PHYSICAL PRINT · COLLECTOR'S ITEM
                      </span>
                      <span className="text-base sm:text-lg font-display font-black text-cyan-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.4)] whitespace-nowrap inline-flex items-baseline gap-1">
                        <span>€</span>
                        <span>14.99</span>
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-display font-black text-white tracking-wide">
                      Sillow Mill — Bingäa (Collector's Graphic Novel)
                    </h4>

                    {/* Direct click-through action */}
                    <button
                      type="button"
                      onClick={handleComicClick}
                      className="w-full mt-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono font-extrabold text-xs shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[40px] transform-gpu hover:scale-[1.01]"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                      <span>View Comic &amp; Order</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
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

          <div className="space-y-5">
            {/* Column 2 Header Badge Row: Stacked Vertically or Wrapped Dynamically on Mobile with Zero Badge Collision */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-[10px] font-mono font-extrabold tracking-widest text-amber-300 uppercase px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-400/50 inline-flex items-center gap-1.5 w-fit">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span>SMARTEST CHOICE · MAXIMUM VALUE</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 text-black text-[10px] sm:text-[11px] font-mono font-black tracking-wider uppercase shadow-[0_0_15px_rgba(245,158,11,0.5)] w-fit shrink-0">
                <Crown className="w-3.5 h-3.5 fill-black text-black shrink-0" />
                <span>ALL-INCLUSIVE PASS</span>
              </span>
            </div>

            {/* Column 2 Title & Subtitle */}
            <div>
              <h3 className="text-xl sm:text-2xl font-display font-black text-white tracking-wide">
                The Membership Pass
              </h3>
              <p className="text-xs sm:text-sm font-sans text-amber-100/70 mt-1 leading-relaxed">
                Everything unlocked in one single pass. All digital extras and monthly drops included.
              </p>
            </div>

            {/* Price Presentation (Crystal Clear, Large, High-End Typography & Psychological Value Comparison) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#151105] to-black border border-amber-400/40 space-y-2">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-amber-300 tracking-tight drop-shadow-[0_2px_15px_rgba(245,158,11,0.35)] whitespace-nowrap inline-flex items-baseline gap-1.5">
                  <span>€</span>
                  <span>60</span>
                </span>
                <span className="text-xs sm:text-sm font-mono text-amber-200/80 font-bold uppercase tracking-wider whitespace-nowrap inline-flex items-baseline gap-1">
                  <span>/ year (~</span>
                  <span className="whitespace-nowrap inline-flex items-baseline gap-0.5">
                    <span>€</span>
                    <span>5</span>
                  </span>
                  <span>/ month)</span>
                </span>
              </div>
              <div className="text-[11px] sm:text-xs font-mono text-emerald-300 flex items-center gap-1.5 font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Save €14.96+ vs separate prices · All extras bundled into one pass</span>
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
                    <strong className="text-white">Vocal Acapella &amp; Remix Pack</strong> (Included in pass)
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">Digital Copy of Bingäa</strong> (4K graphic novel included)
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/70 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">
                    ✓
                  </span>
                  <span>
                    <strong className="text-white">2D Visualizer Production &amp; Logic Pro Assets</strong> (Visualizer workflow, vocal chain &amp; Logic Pro template)
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
                    <strong className="text-white">VIP Pass &amp; Member Lounge Access:</strong> VIP Pass holders and Annual Members get full, unrestricted access to the Pioneer Lounge.
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
            <span className="whitespace-nowrap inline-flex items-baseline gap-1">
              <span>Auto-renews annually via Stripe (</span>
              <span className="whitespace-nowrap inline-flex items-baseline gap-0.5">
                <span>€</span>
                <span>60</span>
              </span>
              <span>/yr)</span>
            </span>
            <button
              type="button"
              onClick={() => {
                soundManager.playTone(540, 0.04);
                if (!isAuthenticated) {
                  openAuthModal('signin', 'Sign in to access your Account & Billing Settings.');
                } else {
                  window.dispatchEvent(new CustomEvent('akinoya-open-billing-settings'));
                }
              }}
              className="hover:text-amber-300 underline underline-offset-2 transition-colors cursor-pointer text-left"
            >
              Cancel anytime in Account &amp; Billing
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TwoColumnPricingSection;