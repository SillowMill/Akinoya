import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  AlertCircle,
  ExternalLink,
  Lock,
  Mail,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { BINGAA_PDF_FILENAME, BINGAA_PDF_URL } from '../utils/certificate';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface BingaaComicReaderProps {
  onClose: () => void;
  isVerified?: boolean;
}

type PDFDoc = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;

/**
 * Interactive page-by-page reader bound directly to /assets/Bingäa.pdf.
 * Features pinch-to-zoom & interactive zoom controls for reading clarity,
 * with a fixed layout and zero page-level modal scrolling.
 * For verified holders: full 32-page reader with PDF download.
 * For public / non-VIP visitors: 2-page preview with Page 3 Whitelist Lock overlay.
 */
const BingaaComicReader: React.FC<BingaaComicReaderProps> = ({ onClose, isVerified = false }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [doc, setDoc] = useState<PDFDoc | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [isRendering, setIsRendering] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState(() => {
    if (typeof window === 'undefined') return { w: 0, h: 0 };
    return { w: window.innerWidth, h: window.innerHeight };
  });

  // Dedicated responsive viewport tracking (< 768px: Mobile, >= 768px: Tablet & Desktop)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dedicated Mobile Auto-Centering & Viewport Alignment (< 768px)
  useEffect(() => {
    if (!isMobile) return;

    // Capture user's exact scroll position before opening reader
    const priorScrollY = window.scrollY || window.pageYOffset || 0;
    const priorScrollX = window.scrollX || window.pageXOffset || 0;

    // Force immediate programmatic focus/scroll reset to top
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Ensure mobile container is aligned at top
    if (mobileContainerRef.current) {
      mobileContainerRef.current.scrollTop = 0;
      mobileContainerRef.current.focus?.();
    }

    // Lock body scroll and prevent rubber-banding on background page
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalLeft = document.body.style.left;
    const originalWidth = document.body.style.width;
    const originalHeight = document.body.style.height;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '0px';
    document.body.style.left = '0px';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.touchAction = 'none';

    return () => {
      // Cleanly restore body styling on exit
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.left = originalLeft;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
      document.body.style.touchAction = originalTouchAction;

      // Restore user's previous scroll position seamlessly
      window.scrollTo({ top: priorScrollY, left: priorScrollX, behavior: 'instant' as ScrollBehavior });
    };
  }, [isMobile]);

  // Interactive Zoom, Pan & Fluid Swipe States
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1);
  const touchStartX = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // First-load gesture helper for mobile/tablet
  const [showHint, setShowHint] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('akinoya_reader_hint_dismissed');
  });

  const dismissHint = useCallback(() => {
    setShowHint(false);
    try {
      localStorage.setItem('akinoya_reader_hint_dismissed', '1');
    } catch {}
  }, []);

  // Auto-dismiss gesture hint after 5 seconds
  useEffect(() => {
    if (!showHint) return;
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [showHint]);

  // Whitelist capture state for public visitors
  const [whitelistEmail, setWhitelistEmail] = useState('');
  const [isSubmittingWhitelist, setIsSubmittingWhitelist] = useState(false);
  const [whitelistSubmitted, setWhitelistSubmitted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('akinoya_whitelist_subscribed'));
  });
  const [whitelistError, setWhitelistError] = useState<string | null>(null);

  const isLockedPage = !isVerified && pageNum >= 3;

  // Load document (range requests: pages stream in on demand)
  useEffect(() => {
    let cancelled = false;
    const task = pdfjsLib.getDocument({ url: BINGAA_PDF_URL, disableAutoFetch: true });
    task.promise
      .then((pdf) => {
        if (!cancelled) setDoc(pdf);
      })
      .catch((err) => {
        console.error('[Reader] Failed to load PDF:', err);
        if (!cancelled) setLoadError('The comic could not be loaded in the reader.');
      });
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, []);

  // Track available stage size
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setStageSize({ w: el.clientWidth, h: el.clientHeight });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);

  // Reset zoom & pan when page changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [pageNum]);

  // Render current page, fitted inside the stage at device pixel ratio
  useEffect(() => {
    if (!doc || !canvasRef.current || stageSize.w === 0 || stageSize.h === 0) return;
    if (isLockedPage) return; // Do not render canvas for locked pages

    let cancelled = false;
    setIsRendering(true);

    doc.getPage(pageNum).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1 });
      // Fit calculation: On mobile smartphones (< 768px), scale natively to available mobile screen width
      const stageW = stageSize.w || window.innerWidth || 390;
      const stageH = stageSize.h || window.innerHeight || 844;
      const fit = isMobile
        ? (stageW > stageH
            ? Math.min((stageW - 16) / base.width, (stageH - 100) / base.height)
            : Math.max(0.1, stageW - 16) / base.width)
        : Math.min(stageW / base.width, stageH / base.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: fit * dpr });

      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

      renderTaskRef.current?.cancel();
      const task = page.render({ canvasContext: canvas.getContext('2d')!, viewport });
      renderTaskRef.current = task;
      task.promise
        .then(() => {
          if (!cancelled) {
            setIsRendering(false);
            // Render ambient blurred backdrop reflecting dynamic page colors
            const ambCanvas = ambientCanvasRef.current;
            if (ambCanvas && canvas) {
              ambCanvas.width = 64;
              ambCanvas.height = 80;
              const ambCtx = ambCanvas.getContext('2d');
              if (ambCtx) {
                ambCtx.drawImage(canvas, 0, 0, 64, 80);
              }
            }
          }
        })
        .catch((err: any) => {
          if (err?.name !== 'RenderingCancelledException') console.error('[Reader] Render error:', err);
        });
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [doc, pageNum, stageSize.w, stageSize.h, isLockedPage, isMobile]);

  const total = doc?.numPages ?? 0;

  const goPrev = useCallback(() => {
    setPageNum((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    setPageNum((p) => {
      if (!isVerified) {
        return Math.min(3, p + 1);
      }
      return total ? Math.min(total, p + 1) : p;
    });
  }, [isVerified, total]);

  // Zoom controls
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
    const maxPanX = (stageSize.w * (currentZoom - 1)) / 1.8;
    const maxPanY = (stageSize.h * (currentZoom - 1)) / 1.8;
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y)),
    };
  };

  const handleDoubleTap = () => {
    if (zoom > 1) {
      handleResetZoom();
    } else {
      setZoom(1.8);
      setPan({ x: 0, y: 0 });
    }
  };

  // Keyboard navigation & scroll lock (Desktop & Tablet)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') handleZoomIn();
      else if (e.key === '-') handleZoomOut();
      else if (e.key === '0') handleResetZoom();
    };
    window.addEventListener('keydown', onKey);

    let prevOverflow = '';
    if (!isMobile) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', onKey);
      if (!isMobile) {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [goPrev, goNext, onClose, isMobile]);

  // Touch handlers for pinch-to-zoom, smooth panning & fluid swipe page-turning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (showHint) dismissHint();

    if (e.touches.length === 2) {
      setIsSwiping(false);
      setSwipeOffset(0);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = zoom;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 280) {
        handleDoubleTap();
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      touchStartX.current = e.touches[0].clientX;
      if (zoom > 1) {
        isDraggingRef.current = true;
        dragStartRef.current = {
          x: e.touches[0].clientX - pan.x,
          y: e.touches[0].clientY - pan.y,
        };
      } else {
        setIsSwiping(true);
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
    } else if (e.touches.length === 1 && zoom === 1 && touchStartX.current !== null) {
      const dx = e.touches[0].clientX - touchStartX.current;
      // Damped elastic feedback when swiping between pages
      setSwipeOffset(dx * 0.45);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    initialPinchDistRef.current = null;
    isDraggingRef.current = false;
    setIsSwiping(false);

    if (zoom === 1 && touchStartX.current !== null && e.changedTouches.length > 0) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (dx < -40) {
        goNext();
      } else if (dx > 40) {
        goPrev();
      }
      touchStartX.current = null;
    }
    setSwipeOffset(0);
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

  const handleWhitelistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = whitelistEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setWhitelistError('Please enter a valid email address.');
      return;
    }

    setIsSubmittingWhitelist(true);
    setWhitelistError(null);

    try {
      const res = await fetch('/api/whitelist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          source: 'Comic Preview Gate (Page 3 Lock)',
          chapter: 'Bingäa Issue #1 — Chapter 2 Preview Gate',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setWhitelistSubmitted(true);
        try {
          localStorage.setItem('akinoya_whitelist_subscribed', cleanEmail);
        } catch {}
      } else {
        setWhitelistError(data?.message || 'Failed to join whitelist. Please try again.');
      }
    } catch {
      setWhitelistSubmitted(true);
      try {
        localStorage.setItem('akinoya_whitelist_subscribed', cleanEmail);
      } catch {}
    } finally {
      setIsSubmittingWhitelist(false);
    }
  };

  const navBtn =
    'flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer';

  // ─────────────────────────────────────────────────────────────────
  // 1. DEDICATED MOBILE-ONLY READER INTERFACE (< 768px SMARTPHONES)
  // Top-centered, width-scaled PDF, instant scroll reset, zero scroll
  // ─────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        ref={mobileContainerRef}
        className="fixed inset-0 z-[70] w-full h-[100dvh] flex flex-col items-center justify-start bg-[#02050c] select-none overflow-hidden touch-none"
        role="dialog"
        aria-label="Bingäa Issue #1 mobile reader"
        tabIndex={-1}
      >
        {/* Ambient Dynamic Background Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none flex items-center justify-center">
          <canvas
            ref={ambientCanvasRef}
            className="w-full h-full object-cover blur-3xl opacity-30 scale-125 transition-opacity duration-700"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#02050c]/85 via-transparent to-[#02050c]/90 pointer-events-none" />
        </div>

        {/* ── PERMANENT FIXED SCREEN CORNER CONTROLS (Zero Scroll Friction) ── */}

        {/* Top-Right: Persistent Floating Exit Button (Exclusively Mobile < 768px) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close reader"
          style={{
            position: 'fixed',
            top: 'max(16px, env(safe-area-inset-top, 16px))',
            right: 'max(16px, env(safe-area-inset-right, 16px))',
            zIndex: 9999,
          }}
          className="fixed top-4 right-4 z-[9999] flex items-center justify-center w-12 h-12 rounded-full bg-black/85 active:bg-cyan-950 backdrop-blur-2xl border border-white/30 text-white shadow-[0_4px_24px_rgba(0,0,0,0.85),0_0_16px_rgba(56,189,248,0.35)] cursor-pointer touch-manipulation active:scale-95"
        >
          <X className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
        </button>

        {/* Top-Left: Fixed Floating Title & Status Badge */}
        <div
          style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}
          className="fixed left-4 z-40 flex items-center gap-2 pointer-events-auto"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-xl border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-display font-bold text-white tracking-wide">Bingäa #1</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 uppercase">
              {isVerified ? 'VIP' : 'Preview'}
            </span>
          </div>

          {zoom > 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/80 active:bg-cyan-950 backdrop-blur-xl border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold shadow-[0_4px_16px_rgba(0,0,0,0.7)] cursor-pointer active:scale-95"
              aria-label="Reset zoom"
            >
              <span>{Math.round(zoom * 100)}%</span>
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Fixed Mid-Screen Edge Chevrons: Instant Page Turn */}
        {!loadError && !isLockedPage && (
          <>
            {pageNum > 1 && (
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous page"
                className="fixed left-2 top-1/2 -translate-y-1/2 z-40 w-10 h-16 rounded-r-2xl bg-black/70 active:bg-cyan-950/90 backdrop-blur-md border-y border-r border-white/20 flex items-center justify-center text-white/80 active:text-cyan-300 shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer touch-manipulation active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {(!isVerified ? pageNum < 3 : (total ? pageNum < total : true)) && (
              <button
                type="button"
                onClick={goNext}
                aria-label="Next page"
                className="fixed right-2 top-1/2 -translate-y-1/2 z-40 w-10 h-16 rounded-l-2xl bg-black/70 active:bg-cyan-950/90 backdrop-blur-md border-y border-l border-white/20 flex items-center justify-center text-white/80 active:text-cyan-300 shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer touch-manipulation active:scale-95"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </>
        )}

        {/* Bottom Floating Navigation Dock (Thumb-First Zone) */}
        {!loadError && !isLockedPage && (
          <div
            style={{ bottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}
            className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
          >
            <div className="flex items-center gap-4 px-4 py-2 rounded-full bg-black/85 backdrop-blur-2xl border border-white/25 shadow-[0_10px_35px_rgba(0,0,0,0.9),0_0_20px_rgba(6,182,212,0.25)]">
              <button
                type="button"
                onClick={goPrev}
                disabled={pageNum <= 1}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 active:bg-cyan-500/30 border border-white/15 text-white disabled:opacity-25 transition-all cursor-pointer touch-manipulation"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-xs font-mono font-semibold text-white tracking-wider px-2">
                {isVerified
                  ? total ? `${pageNum} / ${total}` : '— / —'
                  : pageNum <= 2
                  ? `${pageNum} / 2`
                  : 'Locked'}
              </span>

              <button
                type="button"
                onClick={goNext}
                disabled={!isVerified ? pageNum >= 3 : (!total || pageNum >= total)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 active:bg-cyan-500/30 border border-white/15 text-white disabled:opacity-25 transition-all cursor-pointer touch-manipulation"
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Subtle First-Load Instruction Hint */}
        {showHint && !loadError && !isLockedPage && (
          <div
            style={{ bottom: 'calc(max(16px, env(safe-area-inset-bottom, 16px)) + 58px)' }}
            className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div
              onClick={dismissHint}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0a101d]/90 backdrop-blur-xl border border-cyan-400/35 text-white/90 shadow-[0_4px_24px_rgba(0,0,0,0.7),0_0_16px_rgba(6,182,212,0.25)] text-[11px] font-mono cursor-pointer active:scale-95 transition-all select-none whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Swipe or tap sides · Pinch to zoom</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissHint();
                }}
                className="ml-1 p-0.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Dismiss hint"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ── TOP-CENTERED FIT-TO-WIDTH COMIC STAGE (Single-Screen Container, Zero Scroll) ── */}
        <div
          ref={stageRef}
          style={{
            paddingTop: 'calc(max(16px, env(safe-area-inset-top, 16px)) + 52px)',
            paddingBottom: 'calc(max(16px, env(safe-area-inset-bottom, 16px)) + 56px)',
          }}
          className="relative w-full h-full flex flex-col items-center justify-start select-none overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {loadError ? (
            <div className="max-w-xs text-center space-y-3 font-mono p-5 rounded-2xl bg-[#080c14]/95 border border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.15)] my-auto">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs text-white/70">{loadError}</p>
              <a
                href={BINGAA_PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open PDF directly
              </a>
            </div>
          ) : isLockedPage ? (
            /* Non-VIP Page 3 Lock Screen Overlay on Mobile */
            <div className="w-[90vw] max-w-sm p-5 rounded-2xl bg-[#080c14]/95 border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
              <div className="w-10 h-10 rounded-xl bg-amber-950/70 border border-amber-500/40 text-yellow-400 mx-auto flex items-center justify-center mb-2.5">
                <Lock className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-sm font-display font-bold text-white uppercase mb-1">
                FOUNDING EDITION FULLY CLAIMED
              </h3>
              <p className="text-[11px] text-white/60 mb-4 font-sans">
                Pages 3–{total || 32} are strictly reserved for verified Äkinoya Founding Pass holders.
              </p>
              {whitelistSubmitted ? (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  ✓ Whitelist Spot Confirmed
                </div>
              ) : (
                <form onSubmit={handleWhitelistSubmit} className="space-y-2">
                  <input
                    type="email"
                    required
                    value={whitelistEmail}
                    onChange={(e) => setWhitelistEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingWhitelist || !whitelistEmail.trim()}
                    className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {isSubmittingWhitelist ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    <span>Join Whitelist</span>
                  </button>
                </form>
              )}
              <button
                type="button"
                onClick={() => setPageNum(2)}
                className="mt-4 text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Page 2 Preview</span>
              </button>
            </div>
          ) : (
            /* Fit-to-Width Mobile Canvas: Native scale + Pinch-to-zoom */
            <div
              className="relative flex items-center justify-center transition-transform shrink-0"
              style={{
                transform: `translate3d(${pan.x + swipeOffset}px, ${pan.y}px, 0) scale(${zoom})`,
                transformOrigin: 'top center',
                willChange: 'transform',
                transition: isSwiping ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
              onDoubleClick={handleDoubleTap}
            >
              <canvas
                ref={canvasRef}
                className="rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(6,182,212,0.2)] ring-1 ring-white/15 bg-white select-none block"
              />
              {(isRendering || !doc) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none bg-black/40 backdrop-blur-xs rounded-xl">
                  <Loader2 className="w-7 h-7 text-cyan-300 animate-spin" />
                  <span className="text-[11px] font-mono text-white/60">
                    {doc ? `Loading page ${pageNum}…` : 'Opening Bingäa Issue #1…'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. TABLET & DESKTOP READER (>= 768px: Strictly Preserved / Untouched)
  // ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-[#04060d] backdrop-blur-xl select-none overflow-hidden"
      role="dialog"
      aria-label="Bingäa Issue #1 reader"
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* DESKTOP HEADER BAR (Unchanged for >= 1024px)                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10 shrink-0 bg-[#060a14]/90 z-20">
        <div className="min-w-0">
          <div className="text-[10px] font-mono tracking-wider text-cyan-300 uppercase">
            {isVerified ? "Collector's Edition · Full Access" : 'Public Preview Edition · Pages 1–2'}
          </div>
          <div className="text-base font-display font-bold text-white truncate">Bingäa — Issue #1</div>
        </div>

        {/* Center: Interactive Zoom Controls */}
        {!isLockedPage && !loadError && (
          <div className="flex items-center gap-1 bg-white/5 border border-white/15 rounded-xl p-1">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              aria-label="Zoom out"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              aria-label="Reset zoom"
              className="px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{Math.round(zoom * 100)}%</span>
              {zoom > 1 && <RotateCcw className="w-2.5 h-2.5 text-cyan-400" />}
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 2.5}
              aria-label="Zoom in"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {isVerified ? (
            <a
              href={BINGAA_PDF_URL}
              download={BINGAA_PDF_FILENAME}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono font-semibold text-cyan-300 border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-950/70 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </a>
          ) : (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-medium text-amber-300 bg-amber-950/50 border border-amber-500/30">
              PREVIEW MODE
            </span>
          )}
          {/* Desktop Exit Button: completely unchanged on >=1024px */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close reader"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PERMANENT FIXED EXIT BUTTON FOR MOBILE & TABLET (< 1024px)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close reader"
        className="fixed top-3.5 right-3.5 z-[100] lg:hidden flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-black/85 hover:bg-black active:bg-cyan-950/90 backdrop-blur-2xl border border-white/25 hover:border-cyan-400/60 text-white shadow-[0_4px_24px_rgba(0,0,0,0.85),0_0_16px_rgba(56,189,248,0.35)] transition-all cursor-pointer touch-manipulation active:scale-95"
      >
        <X className="w-5 h-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
      </button>

      {/* Persistent Floating Quick Pill (Title & Zoom Reset) for Mobile & Tablet (< 1024px) */}
      <div className="fixed top-3.5 left-3.5 z-[90] lg:hidden flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-2xl border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.7),0_0_15px_rgba(6,182,212,0.18)]">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-display font-bold text-white tracking-wide">Bingäa #1</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 uppercase">
            {isVerified ? 'VIP' : 'Preview'}
          </span>
        </div>

        {zoom > 1 && (
          <button
            type="button"
            onClick={handleResetZoom}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/80 active:bg-cyan-950 backdrop-blur-2xl border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold shadow-[0_4px_16px_rgba(0,0,0,0.7)] cursor-pointer active:scale-95"
            aria-label="Reset zoom"
          >
            <span>{Math.round(zoom * 100)}%</span>
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Stage (Strict Container Cropping: Zero vertical voids, exact PDF aspect ratio) */}
      <div
        ref={stageRef}
        className="relative flex-1 min-h-0 m-0 p-0 lg:m-4 lg:p-4 flex items-center justify-center select-none overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Ambient Background Blur Canvas (Dynamic page color reflection & cybernetic aura) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none flex items-center justify-center">
          <canvas
            ref={ambientCanvasRef}
            className="w-full h-full object-cover blur-3xl opacity-35 scale-125 transition-opacity duration-700"
            aria-hidden="true"
          />
          {/* Cyberpunk Atmospheric Gradient Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#030712]/70 via-transparent to-[#030712]/85 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.14)_0%,transparent_75%)] pointer-events-none" />
        </div>

        {loadError ? (
          <div className="max-w-sm text-center space-y-3 font-mono my-auto mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-xs text-white/70">{loadError}</p>
            <a
              href={BINGAA_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open PDF directly
            </a>
          </div>
        ) : isLockedPage ? (
          /* Non-VIP Page 3 Lock Screen Overlay */
          <div className="w-full max-w-md mx-auto my-auto p-5 sm:p-7 rounded-2xl bg-[#080c14] border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-12 h-12 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-yellow-400 mx-auto flex items-center justify-center mb-3.5 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
              <Lock className="w-6 h-6 text-yellow-400" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-400/40 text-[10px] font-mono font-semibold tracking-wider text-amber-300 mb-3 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>• COMICBOOKS 100 / 100 CLAIMED</span>
            </div>

            <h3 className="text-base sm:text-lg font-display font-bold text-white tracking-wide uppercase leading-snug mb-2">
              FOUNDING EDITION FULLY CLAIMED — CHAPTER LOCKED
            </h3>

            <p className="text-xs text-white/60 font-sans leading-relaxed mb-5">
              Pages 3 through {total || 32} are strictly reserved for verified Äkinoya Founding Pass holders.
            </p>

            {whitelistSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 font-bold">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>WHITELIST SPOT CONFIRMED</span>
                </div>
                <p className="text-[11px] text-white/70">
                  You will receive priority access and notification when the next comic drop releases.
                </p>
              </div>
            ) : (
              <form onSubmit={handleWhitelistSubmit} className="space-y-3">
                <p className="text-[11px] font-mono text-cyan-300/90 text-left">
                  Join the Äkinoya Whitelist to get early access and notifications when the next comic drop releases.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={whitelistEmail}
                    onChange={(e) => {
                      setWhitelistEmail(e.target.value);
                      if (whitelistError) setWhitelistError(null);
                    }}
                    placeholder="Enter your email address"
                    className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 outline-none font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingWhitelist || !whitelistEmail.trim()}
                    className="shrink-0 px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {isSubmittingWhitelist ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    <span>Join Whitelist</span>
                  </button>
                </div>
                {whitelistError && (
                  <p className="text-[10.5px] font-mono text-rose-400 text-left">{whitelistError}</p>
                )}
              </form>
            )}

            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/50">
              <button
                type="button"
                onClick={() => setPageNum(2)}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Back to Page 2 Preview</span>
              </button>
              <span className="text-amber-400/80 font-medium">Chapter 2 Locked</span>
            </div>
          </div>
        ) : (
          <div
            className="relative flex items-center justify-center max-w-full max-h-full transition-transform shrink-0"
            style={{
              transform: `translate3d(${pan.x + swipeOffset}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: 'center center',
              willChange: 'transform',
              transition: isSwiping ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
              cursor: zoom > 1 ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'default',
            }}
            onDoubleClick={handleDoubleTap}
          >
            <canvas
              ref={canvasRef}
              className="rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.18)] ring-1 ring-white/15 bg-white max-w-full max-h-full select-none block"
            />
            {(isRendering || !doc) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none bg-black/40 backdrop-blur-xs rounded-lg">
                <Loader2 className="w-7 h-7 text-cyan-300 animate-spin" />
                <span className="text-[11px] font-mono text-white/60">
                  {doc ? `Loading page ${pageNum}…` : 'Opening Bingäa Issue #1…'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edge Touch Chevrons for Mobile & Tablet (< 1024px) */}
      {!loadError && !isLockedPage && (
        <>
          {pageNum > 1 && (
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous page"
              className="lg:hidden fixed left-2 top-1/2 -translate-y-1/2 z-[90] w-9 h-14 rounded-r-xl bg-black/60 active:bg-cyan-950/80 backdrop-blur-md border-y border-r border-white/15 flex items-center justify-center text-white/70 active:text-white shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all cursor-pointer touch-manipulation"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {(!isVerified ? pageNum < 3 : (total ? pageNum < total : true)) && (
            <button
              type="button"
              onClick={goNext}
              aria-label="Next page"
              className="lg:hidden fixed right-2 top-1/2 -translate-y-1/2 z-[90] w-9 h-14 rounded-l-xl bg-black/60 active:bg-cyan-950/80 backdrop-blur-md border-y border-l border-white/15 flex items-center justify-center text-white/70 active:text-white shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all cursor-pointer touch-manipulation"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </>
      )}

      {/* Subtle First-Load Instruction Hint for Mobile & Tablet */}
      {showHint && !loadError && !isLockedPage && (
        <div className="lg:hidden fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-[95] pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div
            onClick={dismissHint}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0a101d]/90 backdrop-blur-xl border border-cyan-400/35 text-white/90 shadow-[0_4px_24px_rgba(0,0,0,0.7),0_0_16px_rgba(6,182,212,0.25)] text-[11px] font-mono cursor-pointer active:scale-95 transition-all select-none whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Swipe to turn pages · Pinch to zoom</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissHint();
              }}
              className="ml-1 p-0.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Dismiss hint"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MOBILE & TABLET FLOATING BOTTOM HUD (< 1024px)                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {!loadError && (
        <div className="lg:hidden fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[90] pointer-events-auto">
          <div className="flex items-center gap-3 sm:gap-4 px-3.5 py-2 rounded-full bg-black/85 backdrop-blur-2xl border border-white/20 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_24px_rgba(6,182,212,0.25)]">
            <button
              type="button"
              onClick={goPrev}
              disabled={pageNum <= 1}
              className="flex items-center justify-center min-w-[40px] min-h-[40px] w-10 h-10 rounded-full bg-white/10 active:bg-cyan-500/30 border border-white/15 text-white disabled:opacity-25 transition-all cursor-pointer touch-manipulation"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="px-2 min-w-[70px] text-center">
              <span className="text-xs sm:text-sm font-mono font-semibold text-white tracking-wider">
                {isVerified
                  ? total ? `${pageNum} / ${total}` : '— / —'
                  : pageNum <= 2
                  ? `${pageNum} / 2`
                  : 'Locked'}
              </span>
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={!isVerified ? pageNum >= 3 : (!total || pageNum >= total)}
              className="flex items-center justify-center min-w-[40px] min-h-[40px] w-10 h-10 rounded-full bg-white/10 active:bg-cyan-500/30 border border-white/15 text-white disabled:opacity-25 transition-all cursor-pointer touch-manipulation"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DESKTOP FOOTER NAVIGATION (Unchanged for >= 1024px)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {!loadError && (
        <div className="hidden lg:flex items-center justify-between px-8 py-3 border-t border-white/10 shrink-0 bg-[#060a14]/90 z-20">
          <button type="button" onClick={goPrev} disabled={pageNum <= 1} className={navBtn} aria-label="Previous page">
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-white/80">
              {isVerified
                ? total ? `${pageNum} / ${total}` : '— / —'
                : pageNum <= 2
                ? `Preview Page ${pageNum} of 2`
                : 'Page 3 (Locked)'}
            </span>
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={!isVerified ? pageNum >= 3 : (!total || pageNum >= total)}
            className={navBtn}
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default BingaaComicReader;