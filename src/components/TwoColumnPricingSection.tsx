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
import akinoyaPassCard from '../assets/images/akinoya_pass_card_1790852652003.jpg';
import stage03Img from '../assets/images/stage_03_cockpit_previs_wireframe.jpg';
import stage05Img from '../assets/images/stage_05_cinematic_color_grading_waveform.jpg';
import vocalAcapellaImg from '../assets/images/vocal_acapella_remix_pack.png';

export interface CheckoutProductPayload {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  priceValue: string;
  isPhysical?: boolean;
  image?: string;
  allocationNotice?: string;
  deliveryNotice?: string;
}

export interface TwoColumnPricingSectionProps {
  onSelectComicTab?: () => void;
  onOpenComicReader?: () => void;
  onJoinMemberPass?: () => void;
  onOpenCheckout?: (product: CheckoutProductPayload) => void;
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
  vaultEmoji?: string;
  thumbnailImg: string;
}

const ADDON_PRODUCTS: AddonProduct[] = [
  {
    id: 'workflow',
    title: 'Workflow',
    badge: 'WORKFLOW & LOGIC PRO',
    priceValue: '29.99',
    category: 'WORKFLOW & LOGIC PRO',
    subtitle: 'Official 2D visualizer workflow, Enerwise sound architecture, vocal chain & dedicated Logic Pro template.',
    description:
      'Full access to the official Community Hub workflow (the Äkinoya workflow), including the 2D visualizer production pipeline, Enerwise sound architecture, vocal chain (my vocal chain), and dedicated Logic Pro template. Instantly unlocked and securely stored in your Asset Vault inside the Hub upon purchase. (Excludes the separate Vocal Acapella & Remix Pack).',
    features: [
      'Instant Access: Instantly unlocked and securely stored in your Asset Vault inside the Hub upon purchase',
      'Official Community Hub workflow access (the Äkinoya workflow)',
      'Dedicated Logic Pro template with vocal chain (my vocal chain)',
      '2D Visualizer behind-the-scenes production pipeline',
      '01 · Storyboards & Script Blueprints (2.39:1 framing specs)',
      '02 · Art Direction & Character Anchors (Turnarounds & moodboards)',
      '03 · Blender 3D Previs & Cockpit Rigs (.blend rigs & geometry nodes)',
      '04 · Audio Masters & Stems (excludes standalone Acapella Pack)',
      '05 · Prompt Engineering Bibles (VFX & cinematic prompt parameters)',
    ],
    thumbnailImg: stage03Img,
  },
  {
    id: 'vocal',
    title: 'Vocal Acapella & Remix Pack',
    badge: 'STUDIO AUDIO STEMS',
    priceValue: '19.99',
    category: 'WAV STEMS',
    subtitle: 'Studio Acapellas of the whole "Dream of Akainoya" tracklist.',
    description:
      'Studio Acapellas of the whole "Dream of Akainoya" tracklist. Dry and wet studio vocal stems, master tempo locked and tuned for remixing and production. Instantly unlocked and securely stored in your Asset Vault inside the Hub upon purchase.',
    features: [
      'Instant Access: Instantly unlocked and securely stored in your Asset Vault inside the Hub upon purchase',
      'Master studio vocal leads (Dry & Wet)',
      'Harmonies, ad-libs, and backing vocoder tracks',
      '24-bit / 48kHz uncompressed WAV stems',
    ],
    thumbnailImg: vocalAcapellaImg,
  },
  {
    id: 'comic-digital',
    title: 'Digital Copy of Bingäa',
    badge: '4K GRAPHIC NOVEL',
    priceValue: '9.99',
    category: 'STANDALONE 4K DIGITAL EDITION',
    subtitle: 'Complete graphic novel with interactive viewer & 4K download.',
    description:
      'The complete digital edition of the Bingäa graphic novel in pristine 4K resolution, readable in browser or downloaded as DRM-free PDF. Instantly unlocked and securely stored in your Asset Vault inside the Hub upon purchase.',
    features: [
      'Instant Access: Instantly unlocked and securely stored in your Asset Vault inside the Hub upon purchase',
      'Complete full-color graphic novel',
      'Interactive dual-page flipbook reader',
      'High-DPI PDF storyboard edition',
      'Instant browser reader + DRM-free 4K download',
    ],
    thumbnailImg: bingaaComicCover,
  },
];

export const TwoColumnPricingSection: React.FC<TwoColumnPricingSectionProps> = ({
  onSelectComicTab,
  onOpenComicReader,
  onJoinMemberPass,
  onOpenCheckout,
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
    if (onOpenCheckout) {
      onOpenCheckout({
        id: 'membership',
        title: 'Sillow Mill — Annual Pioneer Member Pass',
        subtitle: 'Pioneer Pass, Physical Welcome Booklet & Signed Bookmark',
        badge: 'ANNUAL ALL-INCLUSIVE PASS · €60/YR',
        priceValue: '60.00',
        isPhysical: true,
        image: akinoyaPassCard,
        allocationNotice: 'Wave 2 Physical Booklet & Collector Pass Card Included',
        deliveryNotice: 'Free Express Delivery · Physical Shipping + Digital Sync',
      });
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
    }
    if (typeof window !== 'undefined') {
      try {
        window.location.hash = '#comic';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        const el = document.getElementById('comic') || document.getElementById('edition') || document.getElementById('akinoya-tabs-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch {
        window.location.hash = '#comic';
      }
    }
  };

  const toggleExpandAddon = (id: string) => {
    soundManager.playTone(540, 0.04);
    setExpandedAddonId((prev) => (prev === id ? null : id));
  };

  return (
    <section
      aria-label="Pricing and Membership Options"
      className={`w-full max-w-7xl mx-auto space-y-6 ${className}`}
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

      {/* Upgraded Solid Frosted Glass Header Banner: Optimal Rich Dark Backing, Zero Typography Bleed, Preserved Smooth Tablet Corner Radius */}
      {!isLoungeView && (
        <div className="rounded-3xl bg-[#060a14]/95 backdrop-blur-2xl border border-cyan-500/30 p-5 sm:p-6 md:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(56,189,248,0.12)] relative isolate">
          {/* Subtle Ambient Gold & Cyan Dual-Glow Beam */}
          <div className="absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 via-amber-300 to-transparent pointer-events-none rounded-full" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
            <div className="space-y-2 flex-1 min-w-0 max-w-2xl xl:max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  OFFICIAL RELEASES &amp; VAULT
                </span>
                <span className="text-[10px] font-mono text-amber-300 font-bold px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-400/40">
                  ALL DIGITAL EXTRAS INCLUDED IN PASS
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-white tracking-wide leading-tight">
                Packs, Comic &amp; Membership
              </h2>
              <p className="text-xs sm:text-sm font-sans text-white/75 leading-relaxed">
                Order standalone production packs and the physical graphic novel, or join the Annual Member Pass for complete, all-inclusive access.
              </p>
            </div>

            {/* Desktop Pyramid Button Structure / Responsive Mobile & Tablet Stack */}
            <div className="shrink-0 flex flex-col items-center gap-2.5 w-full lg:w-auto">
              {/* Pyramid Apex: Community Hub centered */}
              <div className="w-full flex justify-center">
                <button
                  type="button"
                  onClick={handleCommunityClick}
                  className="w-full sm:w-auto group relative px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-950/90 via-blue-950/85 to-indigo-950/90 hover:from-cyan-900/90 hover:to-indigo-900/90 text-cyan-200 hover:text-white border-2 border-cyan-400/60 hover:border-cyan-300 font-mono font-extrabold text-xs shadow-[0_0_22px_rgba(56,189,248,0.35)] hover:shadow-[0_0_32px_rgba(56,189,248,0.55)] transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xl active:scale-[0.98]"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300" />
                  </span>
                  <Users className="w-3.5 h-3.5 text-cyan-300 group-hover:scale-110 transition-transform duration-200 shrink-0" />
                  <span className="tracking-wider uppercase whitespace-nowrap">Community Hub</span>
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-300/80 group-hover:translate-x-0.5 transition-transform duration-200 shrink-0" />
                </button>
              </div>

              {/* Pyramid Base: À La Carte and Join Member Pass side-by-side */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto justify-center">
                {/* À La Carte Section Quick Navigation Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playTone(580, 0.04);
                    const el = document.getElementById('alacarte-section');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="w-full sm:w-auto group relative px-4 sm:px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#071324]/90 via-[#0a1829]/85 to-[#071324]/90 hover:from-cyan-950/90 hover:to-[#0c1f38]/90 text-cyan-200 hover:text-white border-2 border-cyan-400/60 hover:border-cyan-300 font-mono font-extrabold text-xs shadow-[0_0_22px_rgba(56,189,248,0.25)] hover:shadow-[0_0_32px_rgba(56,189,248,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xl active:scale-[0.98]"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-cyan-300 group-hover:scale-110 transition-transform duration-200 shrink-0" />
                  <span className="tracking-wider uppercase whitespace-nowrap">À La Carte</span>
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-300/80 group-hover:translate-x-0.5 transition-transform duration-200 shrink-0" />
                </button>

                {/* Join Member Pass Button (Smooth Anchor Scroll to Membership Pass Section) */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playTone(660, 0.04);
                    const el = document.getElementById('membership-pass-section');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="w-full sm:w-auto group relative px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-950/90 via-yellow-950/85 to-amber-950/90 hover:from-amber-900/90 hover:to-yellow-900/90 text-amber-200 hover:text-white border-2 border-amber-400/60 hover:border-amber-300 font-mono font-extrabold text-xs shadow-[0_0_22px_rgba(245,158,11,0.35)] hover:shadow-[0_0_32px_rgba(245,158,11,0.55)] transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xl active:scale-[0.98]"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform duration-200 shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <span className="tracking-wider uppercase whitespace-nowrap">Join Member Pass · €60/yr</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-300/80 group-hover:translate-x-0.5 transition-transform duration-200 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two-Column Responsive Grid: Side-by-side on desktop (lg:grid-cols-2), cleanly stacked on tablet/mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* ========================================================= */}
        {/* COLUMN 1: Individual Add-ons & Physical Product (À La Carte) */}
        {/* ========================================================= */}
        <div
          id="alacarte-section"
          className="flex flex-col rounded-3xl bg-gradient-to-b from-[#090e1a] via-[#060a14] to-[#04070e] border border-white/15 p-4 xs:p-5 sm:p-7 lg:p-6 xl:p-8 relative overflow-hidden shadow-2xl scroll-mt-20 sm:scroll-mt-24"
        >
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

            {/* 1. PHYSICAL PRINT COLLECTOR'S ITEM (Top Priority Product) */}
            <div className="rounded-2xl bg-gradient-to-b from-[#09152b] via-[#061122] to-[#040c1a] border-2 border-cyan-400/40 p-3.5 sm:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(56,189,248,0.15)] relative overflow-hidden group">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4">
                {/* Top Row on Mobile: Enlarged Thumbnail + Info */}
                <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
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
                      className="w-24 xs:w-28 sm:w-20 md:w-24 h-auto aspect-[3/4] rounded-xl object-cover border border-cyan-400/60 shadow-[0_0_20px_rgba(56,189,248,0.3)] group-hover/thumb:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>

                  {/* Title, Badge, Price & Desktop CTA */}
                  <div className="space-y-2 sm:space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                      <span className="text-[9.5px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 tracking-wider">
                        PHYSICAL PRINT · COLLECTOR'S ITEM
                      </span>
                      <span className="text-base sm:text-lg font-display font-black text-cyan-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.4)] whitespace-nowrap inline-flex items-baseline gap-1">
                        <span>€</span>
                        <span>14.99</span>
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="text-sm sm:text-base font-display font-black text-white tracking-wide leading-snug">
                        Sillow Mill — Bingäa
                      </h4>
                      <p className="text-[11px] sm:text-xs font-mono font-medium text-cyan-200/80 leading-normal">
                        Collector's Graphic Novel
                      </p>
                    </div>

                    {/* Desktop / Tablet CTA Button (Preserved inside right column on sm+) */}
                    <button
                      type="button"
                      onClick={handleComicClick}
                      className="hidden sm:flex w-full mt-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono font-extrabold text-xs shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all cursor-pointer items-center justify-center gap-2 min-h-[40px] transform-gpu hover:scale-[1.01]"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                      <span>View Comic &amp; Order</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Mobile Full-Width CTA Button (Exclusively on mobile < sm) */}
                <button
                  type="button"
                  onClick={handleComicClick}
                  className="sm:hidden w-full mt-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 active:from-cyan-400 active:to-indigo-500 text-white font-mono font-extrabold text-xs shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] active:scale-[0.99]"
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>View Comic &amp; Order</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>

            {/* 2. INDIVIDUAL DIGITAL ADD-ONS: 3 Distinct Cards with Clean Inline Drawer Expansion (Bingäa-Style Architecture) */}
            <div className="space-y-3.5">
              {ADDON_PRODUCTS.map((addon) => {
                const isExpanded = expandedAddonId === addon.id;
                const isComic = addon.id === 'comic-digital';
                return (
                  <div
                    key={addon.id}
                    className="rounded-2xl bg-gradient-to-b from-[#09152b] via-[#061122] to-[#040c1a] border-2 border-cyan-400/40 hover:border-cyan-300/70 p-3.5 sm:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(56,189,248,0.15)] relative overflow-hidden group transition-all"
                  >
                    {/* Luminous Top Cyan Glow Beam (Matching Bingäa physical card) */}
                    <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />

                    {/* Ambient Artwork Backdrop */}
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none filter blur-sm scale-105 transition-opacity duration-500 group-hover:opacity-20"
                      style={{ backgroundImage: `url(${addon.thumbnailImg})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#09152b]/90 via-[#061122]/95 to-[#040c1a] pointer-events-none" />

                    {/* Card Content: Bingäa-Style Horizontal Flex / Grid */}
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4">
                      {/* Top Row on Mobile / Left Column on Desktop: Fixed Prominent Artwork Thumbnail */}
                      <div className="flex items-center gap-3 xs:gap-3.5 sm:gap-4 flex-1 min-w-0">
                        {/* Left Column: Fixed, prominent width full-bleed artwork */}
                        {isComic ? (
                          <div className="shrink-0 rounded-xl overflow-hidden text-left shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                            <img
                              src={addon.thumbnailImg}
                              alt={addon.title}
                              className="w-20 xs:w-22 sm:w-20 md:w-24 h-auto aspect-[3/4] rounded-xl object-cover border border-cyan-400/60 group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        ) : (
                          <div className="shrink-0 rounded-xl overflow-hidden text-left shadow-[0_0_20px_rgba(56,189,248,0.25)]">
                            <img
                              src={addon.thumbnailImg}
                              alt={addon.title}
                              className="w-24 xs:w-28 sm:w-36 md:w-40 lg:w-36 xl:w-44 h-auto aspect-[16/9] rounded-xl object-cover border border-cyan-400/60 group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        )}

                        {/* Right Column: Category Badge, Price Tag, Title, Subtitle, and Desktop CTA Button */}
                        <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
                          {/* Row 1: Badge & Price aligned cleanly */}
                          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                            <span className="text-[9px] sm:text-[9.5px] font-mono font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 tracking-wider">
                              {addon.category}
                            </span>
                            <span className="text-[13.5px] xs:text-sm sm:text-lg font-display font-black text-cyan-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.4)] whitespace-nowrap inline-flex items-baseline gap-0.5 sm:gap-1">
                              <span>€</span>
                              <span>{addon.priceValue}</span>
                            </span>
                          </div>

                          {/* Row 2: Title & Subtitle with full width and zero ellipsis truncation */}
                          <div className="space-y-0.5 sm:space-y-1">
                            <h4 className="text-[13px] xs:text-[13.5px] sm:text-base font-display font-black text-white tracking-wide leading-tight sm:leading-snug group-hover:text-cyan-200 transition-colors">
                              {addon.title}
                            </h4>
                            <p className="text-[11px] sm:text-xs font-sans text-white/75 sm:text-white/70 leading-relaxed">
                              {addon.subtitle}
                            </p>
                          </div>

                          {/* Desktop / Tablet CTA Button (Preserved inside right column on sm+) */}
                          <button
                            type="button"
                            onClick={() => toggleExpandAddon(addon.id)}
                            className={`hidden sm:flex w-full mt-1 py-2 px-4 rounded-xl border font-mono font-extrabold text-xs transition-all cursor-pointer items-center justify-center gap-2 min-h-[38px] transform-gpu hover:scale-[1.01] ${
                              isExpanded
                                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(56,189,248,0.35)]'
                                : 'bg-gradient-to-r from-cyan-950/70 via-[#0a1829] to-cyan-950/70 hover:from-cyan-900/80 hover:to-[#0c1f38] text-cyan-200 hover:text-white border-cyan-400/40 hover:border-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                            }`}
                          >
                            <span>{isExpanded ? 'Hide Details' : 'Details & Order'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Mobile Full-Width CTA Button (Exclusively on mobile < sm, large touch-friendly target) */}
                      <button
                        type="button"
                        onClick={() => toggleExpandAddon(addon.id)}
                        className={`sm:hidden w-full mt-1 py-3 px-4 rounded-xl border font-mono font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] active:scale-[0.99] ${
                          isExpanded
                            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(56,189,248,0.35)]'
                            : 'bg-gradient-to-r from-cyan-950/80 via-[#0a1829] to-cyan-950/80 active:from-cyan-900 active:to-[#0c1f38] text-cyan-200 active:text-white border-cyan-400/40 active:border-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                        }`}
                      >
                        <span>{isExpanded ? 'Hide Details' : 'Details & Order'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 shrink-0" />
                        )}
                      </button>
                    </div>

                    {/* Inline Expandable Drawer: Clean, in-place, zero-modal popup */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="relative z-10 overflow-hidden pt-3 mt-3 border-t border-cyan-500/20 space-y-3"
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

                          {/* High-Contrast Delivery & Asset Vault Notice (Desktop, Tablet & Mobile) */}
                          <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/70 via-[#071324] to-cyan-950/70 border border-cyan-400/50 text-cyan-200 flex items-start gap-2.5 shadow-[0_0_15px_rgba(56,189,248,0.15)]">
                            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                            <div className="text-[11px] sm:text-xs leading-relaxed font-sans">
                              <strong className="text-cyan-300 font-mono font-bold uppercase tracking-wider block text-[10px] sm:text-[10.5px]">
                                Instant Access · Hub Delivery:
                              </strong>
                              <span>
                                Instantly unlocked and securely stored in your <strong>Asset Vault inside the Hub</strong> upon purchase. Stream or download anytime across desktop, tablet, and mobile with zero expiration.
                              </span>
                            </div>
                          </div>

                          {/* Smart Choice: Bundled with Member Pass */}
                          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-400/30 space-y-1 text-xs">
                            <div className="font-mono font-bold text-amber-300 flex items-center gap-1.5">
                              <Crown className="w-3.5 h-3.5" />
                              <span>Smart Choice: Bundled with Member Pass</span>
                            </div>
                            <p className="text-white/70 font-sans text-[11.5px]">
                              Get this pack plus all digital extras, stems, and monthly drops bundled into the Annual Member Pass (€60 per year) at a lower overall price.
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
                                if (onOpenCheckout) {
                                  onOpenCheckout({
                                    id: addon.id,
                                    title: `Sillow Mill — ${addon.title}`,
                                    subtitle: addon.subtitle,
                                    badge: addon.badge,
                                    priceValue: addon.priceValue,
                                    isPhysical: false,
                                    image: addon.thumbnailImg,
                                    allocationNotice:
                                      addon.id === 'vocal'
                                        ? 'Instant Master Stems · 24-bit / 48kHz WAV'
                                        : addon.id === 'workflow' || addon.id === 'logic-visualizer'
                                        ? 'Complete Äkinoya Workflow · Blender Previs & Logic Pro Template'
                                        : 'Pristine 4K Resolution · Web Reader + Offline PDF',
                                    deliveryNotice: 'Instant Digital Delivery · Vault Access',
                                  });
                                  return;
                                }
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
                              <span>Order Pack Only (</span>
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

            {/* 3. STREAMLINED MEMBERSHIP UPSELL SECTION (Clean High-End Card Container) */}
            <div className="rounded-2xl bg-gradient-to-br from-[#120d04]/80 via-[#0a0c16]/90 to-[#04060f]/95 backdrop-blur-md border border-amber-400/40 p-3 xs:p-3.5 sm:p-4 lg:p-3.5 xl:p-4 shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(245,158,11,0.12)] relative overflow-hidden space-y-3 box-border max-w-full">
              {/* Luminous Top Gold Beam */}
              <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent pointer-events-none" />

              {/* Explanatory Info */}
              <div className="text-xs text-white/80 font-sans leading-relaxed flex items-start gap-2.5 px-0.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11.5px] sm:text-xs">
                  <strong className="text-white font-medium">Why buy separately? </strong>
                  Get <strong className="text-amber-300">EVERYTHING</strong> unlocked instantly—including all 3 digital production packs, unreleased audio masters, visualizer workflows, exclusive Pioneer Lounge access, and fresh monthly drops starting January 9, 2027—for just <strong className="text-white">€60 per year</strong> (Save €14.96+ on day one!).
                </div>
              </div>

              {/* High-End Cyberpunk Glassmorphic CTA Button (Mobile, Tablet & Desktop Responsive Layout, Zero Text-Wrap) */}
              <div className="w-full max-w-full box-border overflow-hidden">
                <button
                  type="button"
                  onClick={handleJoinPassClick}
                  className="group relative w-full py-2.5 xs:py-3 sm:py-3.5 px-1.5 xs:px-2.5 sm:px-3 md:px-4 lg:px-2 xl:px-3.5 2xl:px-4 rounded-xl bg-gradient-to-r from-amber-950/90 via-yellow-950/85 to-amber-950/90 hover:from-amber-900/90 hover:to-yellow-900/90 text-amber-200 hover:text-white border-2 border-amber-400/60 hover:border-amber-300 font-mono font-extrabold text-[7.5px] min-[340px]:text-[8.2px] min-[370px]:text-[8.8px] min-[400px]:text-[9.6px] sm:text-[11px] md:text-xs lg:text-[9px] xl:text-[10.5px] 2xl:text-xs shadow-[0_0_22px_rgba(245,158,11,0.35)] hover:shadow-[0_0_32px_rgba(245,158,11,0.55)] transition-all flex items-center justify-center gap-1 min-[380px]:gap-1.5 sm:gap-2 cursor-pointer backdrop-blur-xl active:scale-[0.98] min-h-[42px] sm:min-h-[44px] box-border max-w-full overflow-hidden"
                >
                  <Crown className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4 text-amber-300 group-hover:scale-110 transition-transform duration-200 shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <span className="tracking-tighter min-[400px]:tracking-tight sm:tracking-normal lg:tracking-tighter xl:tracking-tight 2xl:tracking-normal uppercase text-center whitespace-nowrap select-none truncate max-w-full">
                    Skip A La Carte — Unlock All With Member Pass
                  </span>
                  <ArrowRight className="hidden min-[360px]:block w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4 text-amber-300/80 group-hover:translate-x-0.5 transition-transform duration-200 shrink-0" />
                </button>
              </div>

              {/* Green Confirmation Subtext (Clean Two-Line Mobile Layout, Single-Line Desktop) */}
              <div className="flex items-center justify-center gap-1 xs:gap-1.5 text-[8.5px] min-[360px]:text-[9px] xs:text-[9.5px] sm:text-[10px] font-mono text-emerald-300 font-bold text-center pt-0.5 leading-tight sm:leading-snug tracking-tighter min-[360px]:tracking-tight sm:tracking-normal max-w-sm sm:max-w-none mx-auto">
                <Check className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-emerald-400 shrink-0 self-center" />
                <span className="text-center">
                  <span className="block sm:inline">Save €14.96+ instantly vs separate purchases</span>
                  <span className="hidden sm:inline"> · </span>
                  <span className="block sm:inline">Instant access</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: The Membership Pass (€ 60 / year) – All Included */}
        {/* ========================================================= */}
        <div
          id="membership-pass-section"
          className="relative flex flex-col rounded-3xl bg-gradient-to-b from-[#100d05] via-[#090804] to-black border-2 border-amber-400/80 p-4 xs:p-5 sm:p-7 lg:p-8 overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.22)] scroll-mt-24 self-start h-fit w-full"
        >
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

            {/* Clean, Flat Price Presentation directly on Main Widget Background */}
            <div className="space-y-2.5 pt-1">
              <div className="flex flex-wrap items-center gap-3">
                {/* Large Clean €60 Price Display */}
                <span className="text-4xl sm:text-5xl font-display font-black text-amber-300 tracking-tight drop-shadow-[0_2px_18px_rgba(245,158,11,0.35)] whitespace-nowrap inline-flex items-baseline gap-1">
                  <span>€</span>
                  <span>60</span>
                </span>

                {/* Sleek Pill Badges without raw slashes */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 font-mono text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span>€60 PER YEAR</span>
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-amber-200/80 font-mono text-xs font-semibold tracking-wide">
                    ~ €5 PER MONTH
                  </span>
                </div>
              </div>

              <div className="text-[11.5px] sm:text-xs font-mono text-emerald-300 flex items-center gap-1.5 font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Save €14.96+ vs separate prices · All extras bundled into one pass</span>
              </div>
            </div>

            {/* Content List: All-Inclusive Extras */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-mono font-bold tracking-wider text-amber-300/80 uppercase">
                All Digital Extras Included:
              </div>

              <ul className="space-y-2.5 sm:space-y-2 text-xs sm:text-[13px] text-white/85 font-sans leading-relaxed">
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
                    <strong className="text-white">Workflow</strong> (Visualizer workflow, vocal chain &amp; Logic Pro template)
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

              {/* High-Contrast Vault Delivery Notice (All Viewports: Desktop, Tablet & Mobile) */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-yellow-950/40 to-amber-950/70 border border-amber-400/50 text-amber-200 flex items-start gap-2.5 shadow-[0_0_20px_rgba(245,158,11,0.18)]">
                <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div className="text-[11.5px] sm:text-xs leading-relaxed font-sans">
                  <strong className="text-amber-300 font-mono font-bold uppercase tracking-wider block text-[10px] sm:text-[10.5px]">
                    Instant Access &amp; Hub Vault Storage:
                  </strong>
                  <span>
                    Instant Access: Instantly unlocked and securely stored in your <strong>Asset Vault inside the Hub</strong> upon purchase. All production stems, DAW presets, 4K graphic novel, and monthly curated drops stay permanently tied to your account profile.
                  </span>
                </div>
              </div>

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
        </div>
      </div>
    </section>
  );
};

export default TwoColumnPricingSection;