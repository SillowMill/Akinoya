import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Lock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShoppingBag,
  Crown,
} from 'lucide-react';
import { BINGAA_PDF_FILENAME, BINGAA_PDF_URL } from '../utils/certificate';

export interface BingaaComicReaderProps {
  onClose: () => void;
  isVerified?: boolean;
}

const TOTAL_PAGES = 10;
const FREE_PREVIEW_PAGES = 2;

const getPageUrl = (pageIndex: number): string => {
  const padded = String(pageIndex).padStart(2, '0');
  return `/assets/comic/page-${padded}.jpg`;
};

/**
 * Rebuilt High-Performance Immersive Comic Reader Overlay (Mobile, Tablet & Desktop)
 * - Native hardware-accelerated image presentation (zero PDF parsing freeze)
 * - Instant page-flipping with preloading (0ms delay)
 * - Smooth "Ploep" scale & blur entrance transition
 * - Edge-to-edge full-screen viewing with responsive viewport constraints
 * - Pinch-to-zoom, double-tap zoom, and floating zoom controls
 * - Streamlined page navigation arrows (Page 1 ➔ 2 for preview, 1 ➔ 10 for verified)
 * - Non-blocking, dismissible Chapter 2 lock screen for visitors
 */
const BingaaComicReader: React.FC<BingaaComicReaderProps> = ({ onClose, isVerified = false }) => {
  const [pageNum, setPageNum] = useState(1);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [showLockedOverlay, setShowLockedOverlay] = useState(false);

  // Interactive Zoom & Pan States
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  const maxPages = isVerified ? TOTAL_PAGES : FREE_PREVIEW_PAGES;

  // Preload neighboring pages for instant page-flip
  useEffect(() => {
    const pagesToPreload = [pageNum, pageNum + 1, pageNum - 1].filter(
      (p) => p >= 1 && p <= TOTAL_PAGES
    );
    pagesToPreload.forEach((p) => {
      const img = new Image();
      img.src = getPageUrl(p);
    });
  }, [pageNum]);

  // Reset zoom & pan when switching page
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [pageNum]);

  // Keyboard navigation on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLockedOverlay) {
          setShowLockedOverlay(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showLockedOverlay, pageNum, isVerified]);

  const goPrev = useCallback(() => {
    setShowLockedOverlay(false);
    setPageNum((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    if (!isVerified && pageNum >= FREE_PREVIEW_PAGES) {
      setShowLockedOverlay(true);
      return;
    }
    setPageNum((p) => Math.min(maxPages, p + 1));
  }, [isVerified, pageNum, maxPages]);

  // Direct Zoom Controls
  const handleZoomIn = () => {
    setZoom((z) => Math.min(2.5, Number((z + 0.35).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(1, Number((z - 0.35).toFixed(2)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const clampPan = (x: number, y: number, currentZoom: number) => {
    if (currentZoom <= 1) return { x: 0, y: 0 };
    const maxBoundX = (window.innerWidth * (currentZoom - 1)) / 1.7;
    const maxBoundY = (window.innerHeight * (currentZoom - 1)) / 1.7;
    return {
      x: Math.max(-maxBoundX, Math.min(maxBoundX, x)),
      y: Math.max(-maxBoundY, Math.min(maxBoundY, y)),
    };
  };

  // Double-tap or double-click to toggle zoom
  const handleDoubleTap = () => {
    if (zoom > 1) {
      handleResetZoom();
    } else {
      setZoom(1.85);
    }
  };

  // Touch handlers for mobile pan & pinch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialPinchDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchZoomRef.current = zoom;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        handleDoubleTap();
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      if (zoom > 1) {
        isDraggingRef.current = true;
        dragStartRef.current = {
          x: e.touches[0].clientX - pan.x,
          y: e.touches[0].clientY - pan.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = currentDist / initialPinchDistRef.current;
      const nextZoom = Math.min(2.5, Math.max(1, Number((initialPinchZoomRef.current * scaleFactor).toFixed(2))));
      setZoom(nextZoom);
      if (nextZoom === 1) setPan({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && zoom > 1 && isDraggingRef.current) {
      const newX = e.touches[0].clientX - dragStartRef.current.x;
      const newY = e.touches[0].clientY - dragStartRef.current.y;
      setPan(clampPan(newX, newY, zoom));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    initialPinchDistRef.current = null;
    isDraggingRef.current = false;
    if (zoom === 1 && touchStartX.current !== null && e.changedTouches.length > 0) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - (touchStartY.current || 0));
      // Horizontal swipe threshold
      if (Math.abs(dx) > 45 && dy < 80) {
        if (dx < 0) goNext();
        else goPrev();
      }
      touchStartX.current = null;
      touchStartY.current = null;
    }
  };

  // Mouse handlers for desktop pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current && zoom > 1) {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      setPan(clampPan(newX, newY, zoom));
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-2xl select-none overflow-hidden"
      role="dialog"
      aria-label="Bingäa Comic Reader"
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* FLOATING TOP BAR: Minimalist & Frosted Glass                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-3 inset-x-3 sm:top-5 sm:inset-x-6 z-30 flex items-center justify-between gap-2 pointer-events-none">
        {/* Left: Compact Title & Page Indicator Pill */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-xl border border-white/20 text-white shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <span className="text-xs font-display font-black tracking-wide text-white">Bingäa</span>
          <span className="text-white/30 text-xs">·</span>
          <span className="text-xs font-mono font-bold text-cyan-300">
            Page {pageNum} of {maxPages}
          </span>
          {!isVerified && (
            <span className="text-[9.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-400 text-black font-extrabold ml-1">
              Preview
            </span>
          )}
        </div>

        {/* Center: Direct Zoom Floating Controls */}
        <div className="pointer-events-auto flex items-center gap-0.5 bg-black/70 backdrop-blur-xl border border-white/20 rounded-full p-1 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            aria-label="Zoom out"
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            aria-label="Reset zoom"
            className="px-2 py-0.5 text-[11px] font-mono font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{Math.round(zoom * 100)}%</span>
            {zoom > 1 && <RotateCcw className="w-2.5 h-2.5 text-cyan-400" />}
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 2.5}
            aria-label="Zoom in"
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Floating Download (if verified) & Round Close Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          {isVerified && (
            <a
              href={BINGAA_PDF_URL}
              download={BINGAA_PDF_FILENAME}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold text-cyan-300 border border-cyan-500/40 bg-black/70 backdrop-blur-xl hover:bg-cyan-950/70 transition-colors shadow-lg"
              title="Download Master Archival PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/70 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.6)] transition-transform active:scale-95"
            aria-label="Close reader"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FLOATING NAVIGATION ARROWS: Left & Right Edges                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Left Chevron (Previous Page) */}
      <button
        type="button"
        onClick={goPrev}
        disabled={pageNum <= 1}
        aria-label="Previous page"
        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/70 backdrop-blur-xl border border-white/25 hover:border-cyan-400 text-white flex items-center justify-center shadow-[0_4px_25px_rgba(0,0,0,0.7)] transition-all active:scale-90 hover:scale-105 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>

      {/* Right Chevron (Next Page: e.g. Smoothly navigating from page 1 to 2) */}
      <button
        type="button"
        onClick={goNext}
        disabled={isVerified && pageNum >= TOTAL_PAGES}
        aria-label="Next page"
        className={`absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/70 backdrop-blur-xl border border-white/25 hover:border-cyan-400 text-white flex items-center justify-center shadow-[0_4px_25px_rgba(0,0,0,0.7)] transition-all active:scale-90 hover:scale-105 cursor-pointer ${
          !isVerified && pageNum === 1 ? 'ring-2 ring-cyan-400/60 shadow-[0_0_20px_rgba(56,189,248,0.4)]' : ''
        }`}
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STAGE: Edge-to-Edge Comic Presentation (Zero Boxy Containers)  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className="relative w-full h-full flex items-center justify-center select-none overflow-hidden p-2 sm:p-4 pt-14 pb-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative flex items-center justify-center max-w-full max-h-full transition-transform"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center',
            willChange: 'transform',
            cursor: zoom > 1 ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'default',
          }}
          onDoubleClick={handleDoubleTap}
        >
          <img
            key={pageNum}
            src={getPageUrl(pageNum)}
            alt={`Bingäa Graphic Novel — Page ${pageNum}`}
            onLoad={() => setIsLoadingPage(false)}
            onLoadStart={() => setIsLoadingPage(true)}
            className="rounded-xl shadow-[0_10px_50px_rgba(0,0,0,0.85)] max-h-[85vh] sm:max-h-[88vh] max-w-[92vw] sm:max-w-[85vw] object-contain select-none pointer-events-none"
            draggable={false}
          />

          {isLoadingPage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none bg-black/40 backdrop-blur-xs rounded-xl">
              <Loader2 className="w-7 h-7 text-cyan-300 animate-spin" />
              <span className="text-[11px] font-mono text-white/70">
                Loading page {pageNum}…
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FLOATING PREVIEW GATE OVERLAY (When on Page 2 or Past Preview) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(!isVerified && pageNum === 2 && !showLockedOverlay) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 z-30 max-w-md p-3.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-amber-400/50 shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-between gap-3 text-xs font-mono"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="text-amber-300 font-bold flex items-center gap-1.5 text-[11px]">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Chapter 2 Locked (Pages 3–{TOTAL_PAGES})</span>
              </div>
              <p className="text-[10.5px] text-white/70 truncate">
                Full 10-page novel in print edition &amp; Pass.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLockedOverlay(true)}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-bold text-xs shadow-md cursor-pointer hover:scale-105 transition-transform"
            >
              Unlock
            </button>
          </motion.div>
        )}

        {showLockedOverlay && !isVerified && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowLockedOverlay(false);
              }
            }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="relative w-full max-w-sm p-6 rounded-3xl bg-[#080d1a] border border-amber-400/60 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center space-y-4">
              <button
                type="button"
                onClick={() => setShowLockedOverlay(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Close locked screen"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-400/50 text-amber-400 mx-auto flex items-center justify-center shadow-lg">
                <Lock className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-300 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-400/40">
                  Preview Complete · Chapter 2 Locked
                </span>
                <h3 className="text-lg font-display font-black text-white pt-1">
                  Sillow Mill — Bingäa
                </h3>
                <p className="text-xs text-white/75 font-sans leading-relaxed">
                  Pages 3 through {TOTAL_PAGES} are included with the Physical Graphic Novel and the Annual Member Pass.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.location.hash = '#edition';
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] transition-transform"
                >
                  <ShoppingBag className="w-4 h-4 fill-black text-black" />
                  <span>Get Physical Collector's Novel (€ 14.99)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.location.hash = '#pass';
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-white font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Join Member Pass (€ 60/yr)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowLockedOverlay(false);
                    setPageNum(2);
                  }}
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 pt-1 cursor-pointer block mx-auto transition-colors"
                >
                  ← Back to Page 2 Preview
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BingaaComicReader;
