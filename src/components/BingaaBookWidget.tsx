import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  ShoppingBag,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Crown,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export interface BingaaBookWidgetProps {
  onOpenFullscreen: () => void;
  onOrderPhysical: () => void;
  isVerified?: boolean;
  editionDisplay?: string | number;
  isFoundersPass?: boolean;
}

const TOTAL_PAGES = 10;
const FREE_PREVIEW_PAGES = 2;

const getPageUrl = (pageIndex: number): string => {
  const padded = String(pageIndex).padStart(2, '0');
  return `/assets/comic/page-${padded}.jpg`;
};

/**
 * INTERACTIVE 3D/2D BOOK PRESENTATION WIDGET (Scroll-Free)
 * - Desktop / Large Screens: Sleek dual-page open book spread (Pages 1 & 2 side-by-side) with spine depth & center crease.
 * - Mobile: Single-page view with crisp, hardware-accelerated CSS 3D page-flip animation (rotateY, translateZ(0), 60fps on low-end processors).
 * - Scroll-Free: Self-contained layout with zero nested scrollbars.
 */
export const BingaaBookWidget: React.FC<BingaaBookWidgetProps> = ({
  onOpenFullscreen,
  onOrderPhysical,
  isVerified = false,
  editionDisplay,
  isFoundersPass = false,
}) => {
  // Mobile active page: 1 or 2 (or up to 10 if verified)
  const [mobilePage, setMobilePage] = useState<number>(1);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward');

  // Desktop active spread index: 1..5 (Spread 1: Pages 1 & 2)
  const [spreadIndex, setSpreadIndex] = useState<number>(1);
  const maxSpread = isVerified ? 5 : 1;

  // Touch tracking for mobile swipe page-turn
  const touchStartXRef = useRef<number | null>(null);

  // Mobile 3D Page Turn Trigger
  const turnMobilePage = useCallback(
    (direction: 'forward' | 'backward') => {
      if (isFlipping) return;

      if (direction === 'forward') {
        const nextPage = mobilePage + 1;
        if (!isVerified && nextPage > FREE_PREVIEW_PAGES) {
          // Open fullscreen reader to trigger locked preview paywall
          soundManager.playTone(420, 0.06);
          onOpenFullscreen();
          return;
        }
        if (nextPage > TOTAL_PAGES) return;

        soundManager.playTone(640, 0.04);
        setFlipDirection('forward');
        setIsFlipping(true);
        setTimeout(() => {
          setMobilePage(nextPage);
          setIsFlipping(false);
        }, 360);
      } else {
        if (mobilePage <= 1) return;
        soundManager.playTone(560, 0.04);
        setFlipDirection('backward');
        setIsFlipping(true);
        setTimeout(() => {
          setMobilePage((p) => Math.max(1, p - 1));
          setIsFlipping(false);
        }, 360);
      }
    },
    [isFlipping, mobilePage, isVerified, onOpenFullscreen]
  );

  // Desktop Spread Turn
  const turnSpread = useCallback(
    (direction: 'next' | 'prev') => {
      if (direction === 'next') {
        if (!isVerified && spreadIndex >= 1) {
          soundManager.playTone(420, 0.06);
          onOpenFullscreen();
          return;
        }
        if (spreadIndex >= 5) return;
        soundManager.playTone(640, 0.04);
        setSpreadIndex((s) => s + 1);
      } else {
        if (spreadIndex <= 1) return;
        soundManager.playTone(560, 0.04);
        setSpreadIndex((s) => s - 1);
      }
    },
    [isVerified, spreadIndex, onOpenFullscreen]
  );

  const leftPageNum = (spreadIndex - 1) * 2 + 1;
  const rightPageNum = Math.min(TOTAL_PAGES, leftPageNum + 1);

  return (
    <div className="relative w-full rounded-3xl bg-[#060a14]/95 backdrop-blur-2xl border border-cyan-500/30 p-4 sm:p-6 md:p-7 shadow-[0_12px_45px_rgba(0,0,0,0.9),0_0_30px_rgba(56,189,248,0.12)] overflow-hidden">
      {/* Top Ambient Glow Beam */}
      <div className="absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 via-amber-300 to-transparent pointer-events-none" />

      {/* Atmospheric Background Radial Glows */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-500/10 blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex flex-col space-y-4 sm:space-y-5">
        {/* ───────────────────────────────────────────────────────────── */}
        {/* 1. HEADER: Product Badges, Issue Title & Fullscreen Action    */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                SILLOW MILL · FIRST EDITION
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-400/40">
                170 GSM ARCHIVAL PRINT
              </span>
              {isVerified ? (
                <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/40">
                  {isFoundersPass ? 'FOUNDERS PASS (#0)' : `EDITION #${editionDisplay || '1'}`}
                </span>
              ) : null}
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-display font-black text-white tracking-wide">
              Sillow Mill — Bingäa (Collector&apos;s Graphic Novel)
            </h3>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundManager.playTone(660, 0.05);
                onOpenFullscreen();
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-200 hover:text-white border border-cyan-400/50 font-mono text-xs font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.25)] transition-all cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Fullscreen Reader</span>
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 2. INTERACTIVE BOOK DISPLAY (Desktop Dual-Spread / Mobile 3D)  */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="relative w-full flex items-center justify-center py-1 sm:py-3">
          {/* ========================================================= */}
          {/* DESKTOP & TABLET: DUAL-PAGE SPREAD (Pages 1 & 2)           */}
          {/* ========================================================= */}
          <div className="hidden md:flex relative items-center justify-center w-full max-w-4xl mx-auto">
            {/* Previous Spread Button */}
            <button
              type="button"
              onClick={() => turnSpread('prev')}
              disabled={spreadIndex <= 1}
              aria-label="Previous spread"
              className="absolute -left-3 lg:-left-6 z-20 w-10 h-10 rounded-full bg-black/80 backdrop-blur-md border border-white/20 hover:border-cyan-400 text-white flex items-center justify-center transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Book Frame with Dual-Spread */}
            <div
              onClick={() => {
                soundManager.playTone(640, 0.04);
                onOpenFullscreen();
              }}
              className="group relative flex items-center justify-center rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden cursor-pointer border border-white/10 hover:border-cyan-400/50 transition-all duration-300 max-h-[460px] lg:max-h-[500px]"
              title="Click to open full-screen interactive reader"
            >
              {/* Left Page (Page 1) */}
              <div className="relative flex-1 max-h-[460px] lg:max-h-[500px] flex items-center justify-end overflow-hidden bg-black">
                <img
                  src={getPageUrl(leftPageNum)}
                  alt={`Bingäa Page ${leftPageNum}`}
                  className="max-h-[460px] lg:max-h-[500px] w-auto object-contain select-none pointer-events-none group-hover:scale-[1.01] transition-transform duration-300"
                  draggable={false}
                  loading="eager"
                />
                {/* Book Spine Inward Shadow on Right Edge of Left Page */}
                <div
                  className="absolute inset-y-0 right-0 w-12 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.85) 100%)',
                  }}
                />
              </div>

              {/* Physical Center Crease Divider */}
              <div className="w-[3px] self-stretch bg-gradient-to-b from-black via-[#0a0a0c] to-black relative z-20 shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.9)]" />

              {/* Right Page (Page 2) */}
              <div className="relative flex-1 max-h-[460px] lg:max-h-[500px] flex items-center justify-start overflow-hidden bg-black">
                <img
                  src={getPageUrl(rightPageNum)}
                  alt={`Bingäa Page ${rightPageNum}`}
                  className="max-h-[460px] lg:max-h-[500px] w-auto object-contain select-none pointer-events-none group-hover:scale-[1.01] transition-transform duration-300"
                  draggable={false}
                  loading="eager"
                />
                {/* Book Spine Inward Shadow on Left Edge of Right Page */}
                <div
                  className="absolute inset-y-0 left-0 w-12 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to left, transparent 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.85) 100%)',
                  }}
                />
              </div>

              {/* Hover Prompt Badge */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 pointer-events-none">
                <span className="px-4 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-400/60 text-cyan-200 font-mono text-xs font-bold flex items-center gap-2 shadow-xl">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>Click to Read Fullscreen</span>
                </span>
              </div>
            </div>

            {/* Next Spread Button */}
            <button
              type="button"
              onClick={() => turnSpread('next')}
              disabled={isVerified ? spreadIndex >= 5 : spreadIndex >= 1}
              aria-label="Next spread"
              className="absolute -right-3 lg:-right-6 z-20 w-10 h-10 rounded-full bg-black/80 backdrop-blur-md border border-white/20 hover:border-cyan-400 text-white flex items-center justify-center transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* ========================================================= */}
          {/* MOBILE: SINGLE-PAGE VIEW WITH 3D PAGE TURN ANIMATION       */}
          {/* ========================================================= */}
          <div
            className="flex md:hidden flex-col items-center w-full max-w-[280px] xs:max-w-[320px] mx-auto select-none"
            onTouchStart={(e) => {
              if (e.touches.length === 1) {
                touchStartXRef.current = e.touches[0].clientX;
              }
            }}
            onTouchEnd={(e) => {
              if (touchStartXRef.current !== null && e.changedTouches.length > 0) {
                const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
                if (deltaX < -40) {
                  turnMobilePage('forward');
                } else if (deltaX > 40) {
                  turnMobilePage('backward');
                }
                touchStartXRef.current = null;
              }
            }}
          >
            {/* 3D Perspective Stage */}
            <div
              className="relative w-full aspect-[1600/2355] rounded-xl overflow-hidden shadow-[0_15px_45px_rgba(0,0,0,0.9)] border border-white/20 bg-black cursor-pointer"
              style={{
                perspective: '1200px',
              }}
              onClick={() => turnMobilePage('forward')}
            >
              {/* Underlying Next Page (visible when page peels) */}
              <div className="absolute inset-0 w-full h-full bg-black">
                <img
                  src={getPageUrl(mobilePage === 1 ? 2 : 1)}
                  alt="Next comic page preview"
                  className="w-full h-full object-contain select-none pointer-events-none"
                  draggable={false}
                  loading="eager"
                />
              </div>

              {/* Turning Top Page (Pure hardware-accelerated CSS 3D rotateY transform) */}
              <div
                className="absolute inset-0 w-full h-full bg-black origin-left"
                style={{
                  transformStyle: 'preserve-3d',
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: isFlipping
                    ? flipDirection === 'forward'
                      ? 'rotateY(-180deg) translateZ(0)'
                      : 'rotateY(0deg) translateZ(0)'
                    : 'rotateY(0deg) translateZ(0)',
                  transition: isFlipping
                    ? 'transform 0.38s cubic-bezier(0.25, 1, 0.5, 1)'
                    : 'none',
                }}
              >
                <img
                  src={getPageUrl(mobilePage)}
                  alt={`Bingäa Comic Page ${mobilePage}`}
                  className="w-full h-full object-contain select-none pointer-events-none"
                  draggable={false}
                  loading="eager"
                />

                {/* Subtle paper shadow overlay during 3D flip */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                  style={{
                    background:
                      'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 60%)',
                    opacity: isFlipping ? 0.6 : 0,
                  }}
                />
              </div>

              {/* Tap to Flip Guide Badge */}
              <div className="absolute bottom-2.5 inset-x-2 flex items-center justify-between pointer-events-none px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-mono text-white/80">
                <span className="text-cyan-300 font-bold">Page {mobilePage} of 2</span>
                <span className="text-amber-300 font-extrabold flex items-center gap-1">
                  <span>Tap to flip</span>
                  <span>→</span>
                </span>
              </div>
            </div>

            {/* Mobile Flip Navigation Pill */}
            <div className="flex items-center justify-between w-full mt-2.5 px-1 text-xs font-mono">
              <button
                type="button"
                onClick={() => turnMobilePage('backward')}
                disabled={mobilePage <= 1}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-white/80 disabled:opacity-25 hover:text-white transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Page 1</span>
              </button>

              <span className="text-[11px] text-white/50">
                {mobilePage === 1 ? 'Cover / Blueprint' : 'Origin Sequence'}
              </span>

              <button
                type="button"
                onClick={() => turnMobilePage('forward')}
                className="px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-400/40 text-cyan-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 active:scale-95 font-bold"
              >
                <span>{mobilePage === 1 ? 'Page 2' : 'Full Comic'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 3. SCROLL-FREE ACTION CONTROLS & PURCHASE STRIP                */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Full 10-Page Collector&apos;s Edition</span>
            </div>
            <p className="text-[11px] sm:text-xs text-white/70 font-sans">
              Includes physical holographic volume with bioluminescent foil stamping + instant 4K digital reader.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Primary Order Action Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playTone(660, 0.05);
                onOrderPhysical();
              }}
              className="flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <ShoppingBag className="w-4 h-4 fill-black text-black shrink-0" />
              <span>Order Physical (€ 14.99)</span>
            </button>

            {/* Read Digital Action Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playTone(600, 0.04);
                onOpenFullscreen();
              }}
              className="px-4 py-2.5 sm:py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <BookOpen className="w-4 h-4 text-cyan-300 shrink-0" />
              <span className="hidden sm:inline">Read Fullscreen</span>
              <span className="sm:hidden">Read</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
