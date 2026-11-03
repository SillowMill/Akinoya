import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  AlertCircle,
  ExternalLink,
  Lock,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShoppingBag,
  Crown,
} from 'lucide-react';
import { BINGAA_PDF_FILENAME, BINGAA_PDF_URL } from '../utils/certificate';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface BingaaComicReaderProps {
  onClose: () => void;
  isVerified?: boolean;
}

type PDFDoc = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;

/**
 * Immersive Full-Screen Comic Reader Overlay (Mobile & Tablet)
 * Pure full-screen presentation with backdrop blur, zero clunky containers,
 * floating controls, clear page navigation arrows (Page 1 -> 2),
 * and direct zoom buttons for crystal-clear readability.
 */
const BingaaComicReader: React.FC<BingaaComicReaderProps> = ({ onClose, isVerified = false }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [doc, setDoc] = useState<PDFDoc | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [isRendering, setIsRendering] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  // Interactive Zoom & Pan States
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1);
  const touchStartX = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // Locked chapter overlay state for public visitors
  const [showLockedOverlay, setShowLockedOverlay] = useState(false);

  const total = doc?.numPages ?? 20;

  // Load PDF document
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

  // Track stage size dynamically with window resize
  useEffect(() => {
    const updateSize = () => {
      if (typeof window !== 'undefined') {
        setStageSize({ w: window.innerWidth, h: window.innerHeight });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Reset zoom & pan when page changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [pageNum]);

  // Render current page, fitted cleanly edge-to-edge inside the viewport
  useEffect(() => {
    if (!doc || !canvasRef.current || stageSize.w === 0 || stageSize.h === 0) return;

    let cancelled = false;
    setIsRendering(true);

    doc.getPage(pageNum).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1 });
      // Full-screen fit with minimal safe padding for floating controls
      const maxAvailableW = Math.max(300, stageSize.w - 16);
      const maxAvailableH = Math.max(400, stageSize.h - 20);
      const fit = Math.min(maxAvailableW / base.width, maxAvailableH / base.height);
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
          if (!cancelled) setIsRendering(false);
        })
        .catch((err: any) => {
          if (err?.name !== 'RenderingCancelledException') console.error('[Reader] Render error:', err);
        });
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [doc, pageNum, stageSize.w, stageSize.h]);

  const goPrev = useCallback(() => {
    setShowLockedOverlay(false);
    setPageNum((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    if (!isVerified && pageNum >= 2) {
      setShowLockedOverlay(true);
      return;
    }
    setPageNum((p) => Math.min(total, p + 1));
  }, [isVerified, pageNum, total]);

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

  // Keyboard navigation & scroll lock
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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [goPrev, goNext, onClose]);

  // Touch handlers for pinch-to-zoom & smooth panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
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
      if (Math.abs(dx) > 40) {
        if (dx < 0) goNext();
        else goPrev();
      }
      touchStartX.current = null;
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
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-2xl select-none overflow-hidden touch-none"
      role="dialog"
      aria-label="Bingäa Comic Reader"
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* FLOATING TOP BAR: Minimalist & Frosted Glass                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-3 inset-x-3 sm:top-5 sm:inset-x-6 z-30 flex items-center justify-between gap-2 pointer-events-none">
        {/* Left: Compact Title & Page Indicator Pill */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <span className="text-xs font-display font-black tracking-wide text-white">Bingäa</span>
          <span className="text-white/30 text-xs">·</span>
          <span className="text-xs font-mono font-bold text-cyan-300">
            {isVerified ? `Page ${pageNum} of ${total || 20}` : `Page ${pageNum} of 2`}
          </span>
        </div>

        {/* Center: Direct Zoom Floating Controls */}
        <div className="pointer-events-auto flex items-center gap-0.5 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full p-1 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold text-cyan-300 border border-cyan-500/40 bg-black/60 backdrop-blur-xl hover:bg-cyan-950/70 transition-colors shadow-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.6)] transition-transform active:scale-95"
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
        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/65 backdrop-blur-xl border border-white/25 hover:border-cyan-400 text-white flex items-center justify-center shadow-[0_4px_25px_rgba(0,0,0,0.7)] transition-all active:scale-90 hover:scale-110 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>

      {/* Right Chevron (Next Page: e.g. Smoothly navigating from page 1 to 2) */}
      <button
        type="button"
        onClick={goNext}
        disabled={isVerified && pageNum >= total}
        aria-label="Next page"
        className={`absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/65 backdrop-blur-xl border border-white/25 hover:border-cyan-400 text-white flex items-center justify-center shadow-[0_4px_25px_rgba(0,0,0,0.7)] transition-all active:scale-90 hover:scale-110 cursor-pointer ${
          !isVerified && pageNum === 1 ? 'ring-2 ring-cyan-400/60 shadow-[0_0_20px_rgba(56,189,248,0.4)]' : ''
        }`}
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STAGE: Edge-to-Edge Comic Presentation (Zero Boxy Containers)  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        ref={stageRef}
        className="relative w-full h-full flex items-center justify-center select-none overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loadError ? (
          <div className="max-w-sm text-center space-y-3 font-mono p-6 bg-black/80 rounded-2xl border border-rose-500/40">
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
        ) : (
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
            <canvas
              ref={canvasRef}
              className="rounded-xl shadow-[0_10px_50px_rgba(0,0,0,0.85)] bg-white max-w-full max-h-full select-none"
            />
            {isRendering && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none bg-black/40 backdrop-blur-xs rounded-xl">
                <Loader2 className="w-7 h-7 text-cyan-300 animate-spin" />
                <span className="text-[11px] font-mono text-white/70">
                  Loading page {pageNum}…
                </span>
              </div>
            )}
          </div>
        )}
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
                <span>Chapter 2 Locked (Pages 3–{total})</span>
              </div>
              <p className="text-[10.5px] text-white/70 truncate">
                Full 20-page novel in print edition &amp; Pass.
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
            className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="relative w-full max-w-sm p-6 rounded-3xl bg-[#080d1a] border border-amber-400/60 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center space-y-4">
              <button
                type="button"
                onClick={() => setShowLockedOverlay(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
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
                  Pages 3 through {total || 20} are included with the Physical Graphic Novel and the Annual Member Pass.
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