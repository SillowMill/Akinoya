import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  BookOpen,
  Layers,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { BINGAA_PDF_FILENAME, BINGAA_PDF_URL } from '../utils/certificate';
import { soundManager } from '../utils/audio';

export interface BingaaComicReaderProps {
  onClose: () => void;
  isVerified?: boolean;
}

const TOTAL_PAGES = 10;
const FREE_PREVIEW_PAGES = 2;
const TOTAL_SPREADS = 5; // [1-2], [3-4], [5-6], [7-8], [9-10]

const getPageUrl = (pageIndex: number): string => {
  const padded = String(pageIndex).padStart(2, '0');
  return `/assets/comic/page-${padded}.jpg`;
};

/**
 * Pre-cache all 10 comic pages into GPU memory upon module execution
 * so they are immediately available for instantaneous ~30ms page flips.
 */
const preloadedImageCache = new Map<number, HTMLImageElement>();
if (typeof window !== 'undefined') {
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const img = new Image();
    img.src = getPageUrl(p);
    if ('decode' in img) {
      img.decode().catch(() => {});
    }
    preloadedImageCache.set(p, img);
  }
}

/**
 * HIGH-END COMIC READER ENGINE v2.0
 * Architecture:
 * - Mobile: One-handed thumb-first UX, portrait single-page canvas, swipe gestures with elastic edge feedback, double-tap 1.8x focus, multi-touch pinch-to-zoom, bottom thumb control pill.
 * - Tablet: Adaptive orientation switch (landscape dual-spread with center crease shadow; portrait single-page), hybrid touch/stylus/keyboard, interactive pull-up scrub drawer.
 * - Desktop: Cinematic 16:9 ambient backdrop with dynamic edge lighting, realistic book crease, pro keyboard navigation, floating frosted-glass HUD with 2s inactivity auto-hide.
 * - Hardware-accelerated GPU pipeline with zero main-thread parsing freeze.
 */
const BingaaComicReader: React.FC<BingaaComicReaderProps> = ({ onClose, isVerified = false }) => {
  // Page / Spread State
  // Single-page index: 1..10
  const [pageNum, setPageNum] = useState<number>(1);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [showLockedOverlay, setShowLockedOverlay] = useState<boolean>(false);

  // Viewport & Layout Detection
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
    isLandscape: typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : true,
  }));

  // Spread Mode: 'auto' | 'dual' | 'single'
  const [spreadModeOverride, setSpreadModeOverride] = useState<'auto' | 'dual' | 'single'>('auto');
  // Mobile Fit Mode: 'fill' (zero letterboxing, edge-to-edge) vs 'contain'
  const [mobileFitMode, setMobileFitMode] = useState<'fill' | 'contain'>('fill');

  // Compute whether dual-spread layout is active
  const isDualSpread = useMemo(() => {
    if (spreadModeOverride === 'dual') return true;
    if (spreadModeOverride === 'single') return false;
    // Auto mode: Desktop OR (Tablet in Landscape)
    return viewport.isDesktop || (viewport.isTablet && viewport.isLandscape);
  }, [spreadModeOverride, viewport]);

  // Spread index (1..5) derived from current pageNum
  const spreadIndex = useMemo(() => {
    return Math.floor((pageNum - 1) / 2) + 1;
  }, [pageNum]);

  // Current pages on display:
  // In dual mode: leftPage = 2*S - 1, rightPage = 2*S
  // In single mode: [pageNum]
  const leftPageNum = (spreadIndex - 1) * 2 + 1;
  const rightPageNum = Math.min(TOTAL_PAGES, leftPageNum + 1);

  // Maximum allowed pages/spreads
  const maxPage = isVerified ? TOTAL_PAGES : FREE_PREVIEW_PAGES;
  const maxSpread = isVerified ? TOTAL_SPREADS : 1; // Unverified preview is Spread 1 (Pages 1 & 2)

  // Interactive Zoom & Pan States
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  // Floating Glass HUD Auto-Hide (2 seconds of cursor inactivity on Desktop/Tablet)
  const [isHudVisible, setIsHudVisible] = useState<boolean>(true);
  const isHoveringHudRef = useRef<boolean>(false);
  const hudInactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Interactive Page Scrub Drawer
  const [isScrubDrawerOpen, setIsScrubDrawerOpen] = useState<boolean>(false);

  // References for Gestures
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingPanRef = useRef<boolean>(false);
  const dragPanStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1);
  const initialPinchMidRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. VIEWPORT RESIZE & ORIENTATION LISTENER
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setViewport({
        width: w,
        height: h,
        isMobile: w < 768,
        isTablet: w >= 768 && w < 1024,
        isDesktop: w >= 1024,
        isLandscape: w > h,
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. GPU-DRIVEN ASSET PRELOADING
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Re-verify that neighboring and future pages are preloaded and decoded in GPU
    const pagesToEnsure = [
      pageNum,
      pageNum + 1,
      pageNum + 2,
      pageNum - 1,
      pageNum - 2,
    ].filter((p) => p >= 1 && p <= TOTAL_PAGES);

    pagesToEnsure.forEach((p) => {
      if (!preloadedImageCache.has(p)) {
        const img = new Image();
        img.src = getPageUrl(p);
        if ('decode' in img) {
          img.decode().catch(() => {});
        }
        preloadedImageCache.set(p, img);
      }
    });
  }, [pageNum]);

  // Reset zoom & pan when page or spread changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSwipeOffset(0);
  }, [pageNum, isDualSpread]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. AUTO-HIDE HUD CONTROLS (2-second cursor inactivity)
  // ─────────────────────────────────────────────────────────────────────────────
  const resetHudTimer = useCallback(() => {
    setIsHudVisible(true);
    if (hudInactivityTimerRef.current) {
      clearTimeout(hudInactivityTimerRef.current);
    }
    // Only auto-hide on desktop/tablet when scrub drawer is closed and user isn't hovering HUD
    if (!isHoveringHudRef.current && !isScrubDrawerOpen) {
      hudInactivityTimerRef.current = setTimeout(() => {
        setIsHudVisible(false);
      }, 2200);
    }
  }, [isScrubDrawerOpen]);

  useEffect(() => {
    const handlePointerActivity = () => {
      resetHudTimer();
    };

    window.addEventListener('mousemove', handlePointerActivity, { passive: true });
    window.addEventListener('pointermove', handlePointerActivity, { passive: true });
    window.addEventListener('touchstart', handlePointerActivity, { passive: true });
    window.addEventListener('keydown', handlePointerActivity, { passive: true });

    resetHudTimer();

    return () => {
      window.removeEventListener('mousemove', handlePointerActivity);
      window.removeEventListener('pointermove', handlePointerActivity);
      window.removeEventListener('touchstart', handlePointerActivity);
      window.removeEventListener('keydown', handlePointerActivity);
      if (hudInactivityTimerRef.current) {
        clearTimeout(hudInactivityTimerRef.current);
      }
    };
  }, [resetHudTimer]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. NAVIGATION HANDLERS (Single Page vs Dual Spread)
  // ─────────────────────────────────────────────────────────────────────────────
  const goPrev = useCallback(() => {
    setShowLockedOverlay(false);
    if (isDualSpread) {
      if (spreadIndex <= 1) return;
      soundManager.playTone(560, 0.04);
      setPageNum((spreadIndex - 2) * 2 + 1);
    } else {
      if (pageNum <= 1) return;
      soundManager.playTone(560, 0.04);
      setPageNum((p) => Math.max(1, p - 1));
    }
  }, [isDualSpread, spreadIndex, pageNum]);

  const goNext = useCallback(() => {
    if (isDualSpread) {
      if (!isVerified && spreadIndex >= 1) {
        // Attempting to flip past Spread 1 (pages 1 & 2)
        soundManager.playTone(420, 0.06);
        setShowLockedOverlay(true);
        return;
      }
      if (spreadIndex >= TOTAL_SPREADS) return;
      soundManager.playTone(640, 0.04);
      setPageNum(spreadIndex * 2 + 1);
    } else {
      if (!isVerified && pageNum >= FREE_PREVIEW_PAGES) {
        // Attempting to flip past Page 2
        soundManager.playTone(420, 0.06);
        setShowLockedOverlay(true);
        return;
      }
      if (pageNum >= maxPage) return;
      soundManager.playTone(640, 0.04);
      setPageNum((p) => Math.min(maxPage, p + 1));
    }
  }, [isDualSpread, isVerified, spreadIndex, pageNum, maxPage]);

  const jumpToPage = useCallback(
    (targetPage: number) => {
      if (!isVerified && targetPage > FREE_PREVIEW_PAGES) {
        soundManager.playTone(420, 0.06);
        setShowLockedOverlay(true);
        return;
      }
      soundManager.playTone(600 + targetPage * 15, 0.04);
      setPageNum(targetPage);
      setShowLockedOverlay(false);
      if (viewport.isMobile) {
        setIsScrubDrawerOpen(false);
      }
    },
    [isVerified, viewport.isMobile]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. PRO KEYBOARD NAVIGATION (Desktop & Tablet Stylus/Keyboard)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if modifier keys like Ctrl/Meta are held for browser shortcuts
      if (e.metaKey || e.ctrlKey) return;

      if (e.key === 'Escape') {
        if (showLockedOverlay) {
          setShowLockedOverlay(false);
        } else if (isScrubDrawerOpen) {
          setIsScrubDrawerOpen(false);
        } else {
          soundManager.playTone(480, 0.04);
          onClose();
        }
      } else if (
        e.key === 'ArrowRight' ||
        e.key === 'KeyD' ||
        e.code === 'KeyD' ||
        e.key === 'PageDown'
      ) {
        goNext();
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'KeyA' ||
        e.code === 'KeyA' ||
        e.key === 'PageUp'
      ) {
        goPrev();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (e.shiftKey) goPrev();
        else goNext();
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        setZoom((z) => {
          const next = Math.max(1, Number((z - 0.25).toFixed(2)));
          if (next === 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showLockedOverlay, isScrubDrawerOpen, goNext, goPrev]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. PAN CLAMPING & SMOOTH BOUNDS
  // ─────────────────────────────────────────────────────────────────────────────
  const clampPan = (x: number, y: number, currentZoom: number) => {
    if (currentZoom <= 1) return { x: 0, y: 0 };
    const maxBoundX = (window.innerWidth * (currentZoom - 1)) / 1.6;
    const maxBoundY = (window.innerHeight * (currentZoom - 1)) / 1.6;
    return {
      x: Math.max(-maxBoundX, Math.min(maxBoundX, x)),
      y: Math.max(-maxBoundY, Math.min(maxBoundY, y)),
    };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. DOUBLE-TAP FOCUS (1.8x Zoom Centered on Tapped Panel Area)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleDoubleTapFocus = (clientX: number, clientY: number) => {
    if (zoom > 1) {
      // Reset zoom
      soundManager.playTone(520, 0.04);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      // 1.8x Smooth focus on the specific panel area
      soundManager.playTone(720, 0.04);
      const targetZoom = 1.8;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const tapDeltaX = clientX - centerX;
        const tapDeltaY = clientY - centerY;
        // Shift panel towards viewport center
        const targetPanX = -tapDeltaX * (targetZoom - 1);
        const targetPanY = -tapDeltaY * (targetZoom - 1);
        setZoom(targetZoom);
        setPan(clampPan(targetPanX, targetPanY, targetZoom));
      } else {
        setZoom(targetZoom);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. TOUCH GESTURES (Swipe with Elastic Feedback, Pinch-to-Zoom, Spatial Pan)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    resetHudTimer();

    // 2-Finger Pinch Start
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      initialPinchDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialPinchZoomRef.current = zoom;
      initialPinchMidRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      setIsSwiping(false);
      return;
    }

    // 1-Finger Tap & Swipe Tracking
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      const prevTapTime = lastTapTimeRef.current;
      const prevTapPos = lastTapPosRef.current;

      // Check double-tap detection (<320ms and within 30px distance)
      if (
        now - prevTapTime < 320 &&
        Math.hypot(touch.clientX - prevTapPos.x, touch.clientY - prevTapPos.y) < 30
      ) {
        handleDoubleTapFocus(touch.clientX, touch.clientY);
        lastTapTimeRef.current = 0;
        return;
      }

      lastTapTimeRef.current = now;
      lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };

      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;

      if (zoom > 1) {
        isDraggingPanRef.current = true;
        dragPanStartRef.current = {
          x: touch.clientX - pan.x,
          y: touch.clientY - pan.y,
        };
      } else {
        setIsSwiping(true);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Multi-touch Pinch to Zoom
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleFactor = currentDist / initialPinchDistRef.current;
      const nextZoom = Math.min(
        3.0,
        Math.max(1.0, Number((initialPinchZoomRef.current * scaleFactor).toFixed(2)))
      );
      setZoom(nextZoom);
      if (nextZoom === 1) {
        setPan({ x: 0, y: 0 });
      }
      return;
    }

    // Single touch Pan (when zoomed)
    if (e.touches.length === 1 && zoom > 1 && isDraggingPanRef.current) {
      const touch = e.touches[0];
      const newX = touch.clientX - dragPanStartRef.current.x;
      const newY = touch.clientY - dragPanStartRef.current.y;
      setPan(clampPan(newX, newY, zoom));
      return;
    }

    // Single touch Swipe Navigation with Elastic Edge Feedback (when zoom == 1)
    if (e.touches.length === 1 && zoom === 1 && touchStartXRef.current !== null) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartXRef.current;
      const deltaY = Math.abs(touch.clientY - (touchStartYRef.current || 0));

      // Ensure horizontal swipe dominates vertical drift
      if (Math.abs(deltaX) > deltaY) {
        // Elastic Edge Resistance if at boundary
        const isAtStart = isDualSpread ? spreadIndex <= 1 : pageNum <= 1;
        const isAtEnd = isDualSpread
          ? !isVerified || spreadIndex >= TOTAL_SPREADS
          : !isVerified
          ? pageNum >= FREE_PREVIEW_PAGES
          : pageNum >= TOTAL_PAGES;

        let elasticOffset = deltaX;
        if ((isAtStart && deltaX > 0) || (isAtEnd && deltaX < 0)) {
          // Elastic resistance rubber-band (30% travel)
          elasticOffset = deltaX * 0.3;
        }

        setSwipeOffset(elasticOffset);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    initialPinchDistRef.current = null;
    isDraggingPanRef.current = false;

    if (zoom === 1 && touchStartXRef.current !== null && isSwiping) {
      // Swiped past 50px threshold -> change page
      if (swipeOffset < -50) {
        goNext();
      } else if (swipeOffset > 50) {
        goPrev();
      }
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      setSwipeOffset(0);
      setIsSwiping(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. MOUSE PANNING & CONTINUOUS ZOOM (Desktop)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    resetHudTimer();
    if (zoom > 1) {
      isDraggingPanRef.current = true;
      dragPanStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingPanRef.current && zoom > 1) {
      const newX = e.clientX - dragPanStartRef.current.x;
      const newY = e.clientY - dragPanStartRef.current.y;
      setPan(clampPan(newX, newY, zoom));
    }
  };

  const handleMouseUp = () => {
    isDraggingPanRef.current = false;
  };

  // Continuous wheel zoom on desktop
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || zoom > 1) {
      e.preventDefault();
      const delta = -e.deltaY * 0.005;
      setZoom((z) => {
        const next = Math.min(2.8, Math.max(1, Number((z + delta).toFixed(2))));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  const currentSpreadLabel = useMemo(() => {
    if (isDualSpread) {
      return `Spread ${spreadIndex} of ${TOTAL_SPREADS} (Pages ${leftPageNum} & ${rightPageNum})`;
    }
    return `Page ${pageNum} of ${TOTAL_PAGES}`;
  }, [isDualSpread, spreadIndex, leftPageNum, rightPageNum, pageNum]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#020408]/95 backdrop-blur-[20px] select-none overflow-hidden"
      role="dialog"
      aria-label="Bingäa Comic Reader Engine v2.0"
      onWheel={handleWheel}
      onPointerMove={resetHudTimer}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* CINEMATIC AMBIENT BACKDROP: Dynamic Edge Lighting             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep space cosmic radial backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,26,48,0.7)_0%,rgba(2,4,8,0.98)_85%)]" />

        {/* Dynamic Edge Lighting: Amber aura for right page/cover */}
        <motion.div
          animate={{
            opacity: [0.35, 0.5, 0.35],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-transparent blur-[110px]"
        />

        {/* Dynamic Edge Lighting: Bioluminescent Cyan aura for left page/universe */}
        <motion.div
          animate={{
            opacity: [0.3, 0.45, 0.3],
            scale: [1.05, 1, 1.05],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-500/15 to-transparent blur-[120px]"
        />

        {/* Subtle center spine light column */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[300px] -translate-x-1/2 bg-indigo-500/10 blur-[80px]" />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FLOATING GLASS HUD: Top Navigation Bar (Auto-Hides on Inactivity) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        onMouseEnter={() => {
          isHoveringHudRef.current = true;
          setIsHudVisible(true);
        }}
        onMouseLeave={() => {
          isHoveringHudRef.current = false;
          resetHudTimer();
        }}
        className={`absolute top-2 inset-x-2 sm:top-5 sm:inset-x-6 z-40 flex items-center justify-between gap-2 pointer-events-none transition-all duration-300 ${
          isHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {/* Left: Branding & Status Pill */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-xl border border-white/15 text-white shadow-[0_4px_25px_rgba(0,0,0,0.6)]">
          <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs font-display font-black tracking-wide text-white">Bingäa</span>
          <span className="text-white/30 text-xs">·</span>
          <span className="text-xs font-mono font-bold text-cyan-300 truncate max-w-[170px] sm:max-w-none">
            {isDualSpread
              ? `Spread ${spreadIndex}/${TOTAL_SPREADS} (P.${leftPageNum}-${rightPageNum})`
              : `Page ${pageNum} of ${TOTAL_PAGES}`}
          </span>
          {!isVerified && (
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-extrabold ml-1 shadow-xs">
              Preview (P.1–2)
            </span>
          )}
        </div>

        {/* Center: Desktop / Tablet Spread Switch & Zoom Controls */}
        <div className="hidden sm:flex pointer-events-auto items-center gap-1 bg-black/75 backdrop-blur-xl border border-white/15 rounded-full p-1 shadow-[0_4px_25px_rgba(0,0,0,0.6)]">
          {/* Spread View Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              soundManager.playTone(560, 0.04);
              setSpreadModeOverride((current) => (current === 'dual' ? 'single' : 'dual'));
            }}
            className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Toggle Dual Spread vs Single Page view"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">{isDualSpread ? 'Dual Spread' : 'Single Page'}</span>
          </button>

          <span className="w-px h-3.5 bg-white/20" />

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => {
              setZoom((z) => {
                const next = Math.max(1, Number((z - 0.25).toFixed(2)));
                if (next === 1) setPan({ x: 0, y: 0 });
                return next;
              });
            }}
            disabled={zoom <= 1}
            aria-label="Zoom out"
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={() => {
              soundManager.playTone(520, 0.04);
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            aria-label="Reset zoom"
            className="px-2 py-0.5 text-[11px] font-mono font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{Math.round(zoom * 100)}%</span>
            {zoom > 1 && <RotateCcw className="w-2.5 h-2.5 text-cyan-400" />}
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => {
              setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))));
            }}
            disabled={zoom >= 2.5}
            aria-label="Zoom in"
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Drawer Toggle, PDF Download & Exit */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Visual Scrub Drawer Toggle */}
          <button
            type="button"
            onClick={() => {
              soundManager.playTone(560, 0.04);
              setIsScrubDrawerOpen((o) => !o);
            }}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold border backdrop-blur-xl transition-all cursor-pointer shadow-md ${
              isScrubDrawerOpen
                ? 'bg-amber-400 text-black border-amber-300 font-extrabold'
                : 'bg-black/75 text-white/90 border-white/15 hover:bg-white/15'
            }`}
          >
            <span>Pages 1–10</span>
            {isScrubDrawerOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {/* Download Archival PDF (Verified Pass Holders) */}
          {isVerified && (
            <a
              href={BINGAA_PDF_URL}
              download={BINGAA_PDF_FILENAME}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold text-cyan-300 border border-cyan-500/40 bg-black/75 backdrop-blur-xl hover:bg-cyan-950/70 transition-colors shadow-lg"
              title="Download Master Archival PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </a>
          )}

          {/* Round Exit Button */}
          <button
            type="button"
            onClick={() => {
              soundManager.playTone(480, 0.04);
              onClose();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shadow-[0_4px_25px_rgba(0,0,0,0.6)] transition-transform active:scale-95"
            aria-label="Close reader"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FLOATING SIDE CHEVRONS (Desktop & Tablet)                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Previous Chevron */}
      <button
        type="button"
        onClick={goPrev}
        disabled={isDualSpread ? spreadIndex <= 1 : pageNum <= 1}
        aria-label="Previous page"
        className={`hidden sm:flex absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 md:w-13 md:h-13 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 hover:border-cyan-400 text-white items-center justify-center shadow-[0_4px_30px_rgba(0,0,0,0.8)] transition-all active:scale-90 hover:scale-105 disabled:opacity-0 disabled:pointer-events-none cursor-pointer ${
          isHudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>

      {/* Next Chevron */}
      <button
        type="button"
        onClick={goNext}
        disabled={
          isDualSpread
            ? isVerified && spreadIndex >= TOTAL_SPREADS
            : isVerified && pageNum >= TOTAL_PAGES
        }
        aria-label="Next page"
        className={`hidden sm:flex absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 md:w-13 md:h-13 rounded-full bg-black/75 backdrop-blur-xl border border-white/20 hover:border-cyan-400 text-white items-center justify-center shadow-[0_4px_30px_rgba(0,0,0,0.8)] transition-all active:scale-90 hover:scale-105 cursor-pointer ${
          !isVerified && (isDualSpread ? spreadIndex === 1 : pageNum === 1)
            ? 'ring-2 ring-cyan-400/70 shadow-[0_0_25px_rgba(56,189,248,0.5)]'
            : ''
        } ${isHudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN COMIC STAGE (Single Page vs Dual Spread)                 */}
      {/* Fluid Edge-to-Edge Canvas: Zero Letterboxing / Zero Dead Space */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative w-full h-[100dvh] flex items-center justify-center select-none overflow-hidden p-0 m-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative flex items-center justify-center w-full h-[100dvh] transition-transform"
          style={{
            transform: `translate3d(${pan.x + swipeOffset}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center',
            willChange: 'transform',
            cursor: zoom > 1 ? (isDraggingPanRef.current ? 'grabbing' : 'grab') : 'default',
          }}
          onDoubleClick={(e) => handleDoubleTapFocus(e.clientX, e.clientY)}
        >
          {/* ========================================================= */}
          {/* MODE A: DUAL-PAGE SPREAD (Desktop & Landscape Tablet)     */}
          {/* Fluid Full-Height Edge-to-Edge Spread (Zero Letterboxing) */}
          {/* ========================================================= */}
          {isDualSpread ? (
            <div className="relative flex items-center justify-center w-full h-[100dvh] max-h-[100dvh] overflow-hidden">
              {/* Left Page (e.g. Page 1, Page 3, Page 5) */}
              <div className="relative h-[100dvh] flex-1 flex items-center justify-end overflow-hidden">
                <img
                  key={`spread-left-${leftPageNum}`}
                  src={getPageUrl(leftPageNum)}
                  alt={`Bingäa Graphic Novel — Page ${leftPageNum}`}
                  className="h-[100dvh] max-h-[100dvh] w-auto max-w-[50vw] object-contain select-none pointer-events-none drop-shadow-[0_10px_35px_rgba(0,0,0,0.85)]"
                  draggable={false}
                  loading="eager"
                />
                {/* Book Spine Shadow: Right edge of left page */}
                <div
                  className="absolute inset-y-0 right-0 w-8 sm:w-16 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.9) 100%)',
                  }}
                />
              </div>

              {/* Physical Center Crease / Spine Divider */}
              <div className="w-[2px] sm:w-[3px] self-stretch bg-gradient-to-b from-black via-[#0a0a0c] to-black relative z-20 shrink-0 shadow-[0_0_12px_rgba(0,0,0,0.9)]" />

              {/* Right Page (e.g. Page 2, Page 4, Page 6) */}
              <div className="relative h-[100dvh] flex-1 flex items-center justify-start overflow-hidden">
                <img
                  key={`spread-right-${rightPageNum}`}
                  src={getPageUrl(rightPageNum)}
                  alt={`Bingäa Graphic Novel — Page ${rightPageNum}`}
                  className="h-[100dvh] max-h-[100dvh] w-auto max-w-[50vw] object-contain select-none pointer-events-none drop-shadow-[0_10px_35px_rgba(0,0,0,0.85)]"
                  draggable={false}
                  loading="eager"
                />
                {/* Book Spine Shadow: Left edge of right page */}
                <div
                  className="absolute inset-y-0 left-0 w-8 sm:w-16 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to left, transparent 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.9) 100%)',
                  }}
                />
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* MODE B: SINGLE-PAGE VIEW (Mobile Portrait & Tablet Port.) */
            /* Fluid Full-Height Edge-to-Edge Single Page                */
            /* ========================================================= */
            <div className="relative flex items-center justify-center w-full h-[100dvh] max-h-[100dvh] overflow-hidden">
              <img
                key={`single-${pageNum}`}
                src={getPageUrl(pageNum)}
                alt={`Bingäa Graphic Novel — Page ${pageNum}`}
                onLoad={() => setIsLoadingPage(false)}
                onLoadStart={() => setIsLoadingPage(true)}
                className={`select-none pointer-events-none drop-shadow-[0_10px_40px_rgba(0,0,0,0.85)] ${
                  viewport.isMobile && mobileFitMode === 'fill'
                    ? 'w-full h-[100dvh] object-cover object-top'
                    : 'h-[100dvh] max-h-[100dvh] w-auto max-w-[100vw] object-contain'
                }`}
                draggable={false}
                loading="eager"
              />

              {isLoadingPage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none bg-black/40 backdrop-blur-xs">
                  <Loader2 className="w-7 h-7 text-cyan-300 animate-spin" />
                  <span className="text-[11px] font-mono text-white/70">
                    Loading page {pageNum}…
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MOBILE ONE-HANDED THUMB CONTROL PILL (Ultra-Compact & Reachable) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewport.isMobile && (
        <div
          className={`absolute bottom-3 inset-x-3 z-40 flex items-center justify-center pointer-events-none transition-all duration-300 pb-[env(safe-area-inset-bottom)] ${
            isHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-2xl border border-white/20 text-white shadow-[0_8px_30px_rgba(0,0,0,0.85)]">
            {/* Prev Page Button */}
            <button
              type="button"
              onClick={goPrev}
              disabled={pageNum <= 1}
              aria-label="Previous page"
              className="p-1 rounded-full text-white/80 hover:text-white disabled:opacity-25 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Counter */}
            <span className="text-xs font-mono font-extrabold text-cyan-300 px-1">
              {pageNum} / {maxPage}
            </span>

            {/* Next Page Button */}
            <button
              type="button"
              onClick={goNext}
              aria-label="Next page"
              className="p-1 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-cyan-300" />
            </button>

            <span className="w-px h-3.5 bg-white/20 mx-0.5" />

            {/* Zoom Toggle Pill: 1.8x <-> 1.0x */}
            <button
              type="button"
              onClick={() => {
                if (zoom > 1) {
                  soundManager.playTone(520, 0.04);
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                } else {
                  soundManager.playTone(720, 0.04);
                  setZoom(1.8);
                }
              }}
              className="px-2 py-0.5 rounded-full bg-white/10 text-[10.5px] font-mono font-bold text-amber-300 active:scale-95 transition-transform"
            >
              {zoom > 1 ? '1.0x' : '1.8x'}
            </button>

            <span className="w-px h-3.5 bg-white/20 mx-0.5" />

            {/* Zero-Letterbox Fit Toggle */}
            <button
              type="button"
              onClick={() => {
                soundManager.playTone(540, 0.04);
                setMobileFitMode((m) => (m === 'fill' ? 'contain' : 'fill'));
              }}
              className="px-2 py-0.5 rounded-full bg-white/10 text-[10.5px] font-mono font-bold text-cyan-300 active:scale-95 transition-transform"
              title="Toggle Zero-Letterbox Fill vs Full Page Contain"
            >
              {mobileFitMode === 'fill' ? 'Fill' : 'Page'}
            </button>

            <span className="w-px h-3.5 bg-white/20 mx-0.5" />

            {/* Scrub Drawer Toggle */}
            <button
              type="button"
              onClick={() => {
                soundManager.playTone(560, 0.04);
                setIsScrubDrawerOpen((o) => !o);
              }}
              aria-label="Page drawer"
              className="p-1 rounded-full text-white/80 hover:text-white active:scale-95 transition-transform"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-300" />
            </button>

            <span className="w-px h-3.5 bg-white/20 mx-0.5" />

            {/* Exit Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playTone(480, 0.04);
                onClose();
              }}
              aria-label="Exit reader"
              className="p-1 rounded-full text-white/70 hover:text-white active:scale-95 transition-transform"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INTERACTIVE PAGE SCRUB DRAWER (Pull-up Thumbnail Strip)        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isScrubDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 inset-x-0 z-50 p-3 sm:p-4 bg-gradient-to-t from-black via-black/95 to-black/80 backdrop-blur-2xl border-t border-white/15 shadow-[0_-10px_40px_rgba(0,0,0,0.9)] pb-[max(16px,env(safe-area-inset-bottom))]"
          >
            <div className="max-w-4xl mx-auto space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-white/70 px-1">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Interactive Visual Strip · 10 Pages</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsScrubDrawerOpen(false)}
                  className="p-1 text-white/60 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal Scrollable Thumbnails Strip */}
              <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 no-scrollbar touch-pan-x">
                {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map((p) => {
                  const isLocked = !isVerified && p > FREE_PREVIEW_PAGES;
                  const isActive = isDualSpread
                    ? p === leftPageNum || p === rightPageNum
                    : p === pageNum;

                  return (
                    <button
                      key={`thumb-${p}`}
                      type="button"
                      onClick={() => jumpToPage(p)}
                      className={`group relative shrink-0 rounded-lg overflow-hidden border transition-all duration-200 cursor-pointer flex flex-col items-center ${
                        isActive
                          ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                          : 'border-white/20 hover:border-cyan-400/60 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="relative w-14 h-20 sm:w-16 sm:h-24 bg-black/60 overflow-hidden">
                        <img
                          src={getPageUrl(p)}
                          alt={`Thumbnail Page ${p}`}
                          className="w-full h-full object-cover select-none pointer-events-none"
                          loading="lazy"
                        />
                        {isLocked && (
                          <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-0.5 text-amber-400">
                            <Lock className="w-3.5 h-3.5" />
                            <span className="text-[8px] font-mono font-extrabold tracking-wider">
                              VIP
                            </span>
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold py-0.5 px-1 w-full text-center truncate ${
                          isActive ? 'bg-amber-400 text-black font-extrabold' : 'bg-black/90 text-white/80'
                        }`}
                      >
                        P.{p}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FRICTIONLESS CHAPTER LOCK / PREVIEW LIMIT PAYWALL STATE        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLockedOverlay && !isVerified && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowLockedOverlay(false);
              }
            }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-[24px]"
          >
            <div className="relative w-full max-w-sm sm:max-w-md p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#0b1329] via-[#050814] to-black border border-amber-400/60 shadow-[0_0_60px_rgba(245,158,11,0.3)] text-center space-y-4">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowLockedOverlay(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                aria-label="Close paywall modal"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Glowing Lock Emblem */}
              <div className="w-13 h-13 rounded-2xl bg-amber-950/80 border border-amber-400/60 text-amber-400 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                <Lock className="w-6 h-6" />
              </div>

              {/* Copy */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-extrabold tracking-widest uppercase text-amber-300 px-3 py-0.5 rounded-full bg-amber-950/70 border border-amber-400/40 inline-flex items-center gap-1.5 shadow-xs">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Preview Complete · Chapter 2 Locked</span>
                </span>
                <h3 className="text-xl sm:text-2xl font-display font-black text-white pt-1">
                  Sillow Mill — Bingäa
                </h3>
                <p className="text-xs sm:text-sm text-white/80 font-sans leading-relaxed">
                  Pages 3 through {TOTAL_PAGES} contain the complete graphic origin story, official 2D
                  blueprint, and secrets of the Sillow Mill universe.
                </p>
              </div>

              {/* Direct Purchase Actions */}
              <div className="space-y-2.5 pt-1">
                {/* Physical Collector's Novel */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playTone(660, 0.05);
                    onClose();
                    window.location.hash = '#edition';
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-[0.98] transition-all"
                >
                  <ShoppingBag className="w-4 h-4 fill-black text-black shrink-0" />
                  <span>Get Physical Collector&apos;s Novel (€ 14.99)</span>
                </button>

                {/* Annual Member Pass */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playTone(660, 0.05);
                    onClose();
                    window.location.hash = '#pass';
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-400/50 hover:border-cyan-300 text-cyan-200 hover:text-white font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.25)] transition-all"
                >
                  <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Join Member Pass (€ 60/yr)</span>
                </button>

                {/* Back to Preview Return Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playTone(540, 0.04);
                    setShowLockedOverlay(false);
                    setPageNum(2);
                  }}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 pt-1 cursor-pointer block mx-auto transition-colors"
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
